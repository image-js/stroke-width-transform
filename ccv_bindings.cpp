#include <emscripten.h>
#include <emscripten/bind.h>
#include <array>
#include <string>
#include <utility>

extern "C" {
#include <ccv.h>
#include <ccv_internal.h>
}

using namespace emscripten;

int main() {
  ccv_enable_default_cache();
}

int ccv_read_html(const val& imageData, ccv_dense_matrix_t** mat, int type) {
  std::string s = imageData["data"].as<std::string>(); 
  int width = imageData["width"].as<int>();
  int height = imageData["height"].as<int>();

  // Read the rgba raw data into a ccv_dense_matrix_t*
  assert(type == CCV_IO_GRAY || type == CCV_IO_RGB_COLOR);
  ccv_read(s.c_str(), mat, CCV_IO_RGBA_RAW | type, height, width, width * 4);
  return 0;
}


// Wrap ccv_array_t with type information
template<typename T>
struct CCVArray : public ccv_array_t {
  static std::shared_ptr<CCVArray<T>> fromJS(val jsArray) {
    int length = jsArray["length"].as<int>();
    auto array = make_shared_with_delete((CCVArray<T>*)ccv_array_new(sizeof(T), length, 0));
    for (int i = 0; i < length; i++) {
      T temp = jsArray[i].as<T>();
      ccv_array_push(array.get(), &temp);
    }
    return array;
  }

  void push(const T& x) {
    ccv_array_push(this, &x);
  }

  const T& get(int i) const {
    return *(T*)ccv_array_get(this, i);
  }

  val toJS() const {
    val jsArray = val::array();
    for (int i = 0; i < this->rnum; i++) {
      jsArray.call<void>("push", val(*(T*)ccv_array_get(this, i)));
    }
    return jsArray;
  }
};


// Deleters
template<typename T>
struct Deleter { // Default deleter, probably only used by ccv_tld_info_t
  void operator()(T* ptr) {
    //printf("%p %s default freed\n", ptr, typeid(T).name());
    delete ptr;
  }
};
template<>
struct Deleter<ccv_dense_matrix_t> {
  void operator()(ccv_dense_matrix_t* ptr) {
    //printf("%p %s freed\n", ptr, typeid(ccv_dense_matrix_t).name());
    ccv_matrix_free(ptr);
  }
};
template<typename T>
struct Deleter<CCVArray<T>> {
  void operator()(CCVArray<T>* ptr) {
    //printf("%p %s freed\n", ptr, typeid(CCVArray<T>).name());
    ccv_array_free(ptr);
  }
};


// Takes ownership of a raw pointer and adds the correct deleter for that type
template<typename T>
auto make_shared_with_delete(T* ptr) {
  //printf("%p %s alloced\n", ptr, typeid(T).name());
  return std::shared_ptr<T>(ptr, Deleter<T>());
};



auto ccv_dense_matrix_t_get_rows(const std::shared_ptr<ccv_dense_matrix_t>& ptr) {
  return ptr->rows;
}
auto ccv_dense_matrix_t_get_cols(const std::shared_ptr<ccv_dense_matrix_t>& ptr) {
  return ptr->cols;
}
auto ccv_dense_matrix_t_get_step(const std::shared_ptr<ccv_dense_matrix_t>& ptr) {
  return ptr->step;
}
auto ccv_dense_matrix_t_get_type(const std::shared_ptr<ccv_dense_matrix_t>& ptr) {
  return ptr->type;
}

val ccv_dense_matrix_t_get_data(const std::shared_ptr<ccv_dense_matrix_t>& pointer) {
  // Returns a js typed array view of the emscripten heap where the data array lives
  int numElement = pointer->step * pointer->rows / CCV_GET_DATA_TYPE_SIZE(pointer->type);
  switch(CCV_GET_DATA_TYPE(pointer->type)) {
    case CCV_8U:
      return val(typed_memory_view(numElement, pointer->data.u8));
    case CCV_32S:
      return val(typed_memory_view(numElement, pointer->data.i32));
    case CCV_32F:
      return val(typed_memory_view(numElement, pointer->data.f32));
    case CCV_64S:
      assert(false);
      // Note: Since there are no 64 bit integers in javascript, this line won't work:
      // return val(typed_memory_view(numElement, pointer->data.i64));
    case CCV_64F:
      return val(typed_memory_view(numElement, pointer->data.f64));
    default:
      return val::null();
  }
}

template<typename T>
void CCVArray_push(const std::shared_ptr<CCVArray<T>>& ptr, const T& x) {
  ptr->push(x);
}
template<typename T>
const T& CCVArray_get(const std::shared_ptr<CCVArray<T>>& ptr, int i) {
  return ptr->get(i);
}
template<typename T>
int CCVArray_get_rnum(const std::shared_ptr<CCVArray<T>>& ptr) {
  return ptr->rnum;
}
template<typename T>
val CCVArray_toJS(const std::shared_ptr<CCVArray<T>>& ptr) {
  return ptr->toJS();
}


// int ccv_read(const char *in, ccv_dense_matrix_t **x, int type)
int ccvjs_read(val source, std::shared_ptr<ccv_dense_matrix_t>& out, int type) {
  ccv_dense_matrix_t* out_ptr = nullptr;
  int ret = ccv_read_html(source, &out_ptr, type);
  out = make_shared_with_delete(out_ptr);
  return ret;
}
int ccvjs_read(val source, std::shared_ptr<ccv_dense_matrix_t>& out) {
  return ccvjs_read(source, out, CCV_IO_GRAY);
}
// ccv_array_t* ccv_swt_detect_words(ccv_dense_matrix_t* a, ccv_swt_param_t params);
std::shared_ptr<CCVArray<ccv_rect_t>> ccvjs_swt_detect_words(const std::shared_ptr<ccv_dense_matrix_t>& a, ccv_swt_param_t params = ccv_swt_default_params) {
  return make_shared_with_delete((CCVArray<ccv_rect_t>*)ccv_swt_detect_words(a.get(), params));
}


template<typename T>
void register_ccv_array(const char* name) {
  class_<CCVArray<T>, base<ccv_array_t>>(name)
    .smart_ptr_constructor("shared_ptr<ccv_array_t>", &std::make_shared<CCVArray<T>>)
    .class_function("fromJS", &CCVArray<T>::fromJS)
    // TODO: Should bind directly to the member functions of CCVArray<T> but doing so seems to hit a bug
    // where it will keep using the stale pointer in the shared_ptr even after being changed.
    // Wrapping the functions seems to avoid the problem.
    // https://github.com/kripken/emscripten/issues/4583
    .function("getLength", &CCVArray_get_rnum<T>)
    .function("get", &CCVArray_get<T>)
    .function("push", &CCVArray_push<T>)
    .function("toJS", &CCVArray_toJS<T>);
}

template<typename T, std::size_t... I>
void register_array_elements(T& a, std::index_sequence<I...>) {
  (a.element(index<I>()), ...);
}
template<typename T, size_t N>
void register_array(const char* name) {
  value_array<std::array<T, N>> temp(name);
  register_array_elements(temp, std::make_index_sequence<N>());
}

EMSCRIPTEN_BINDINGS(ccv_js_module) {
  // TODO: These bindings were added by hand so there are a lot stuff missing. Should add a header parser to try to autogenerate them.

  // TODO: Constructing each wrapped class as an empty shared_ptr doesn't seem to work.
  // So just use a spurious make_shared for constructor that will be reset by our custom make_shared_with_deleter later.
  // The object returned will be in an undefined state before then!
  class_<ccv_dense_matrix_t>("ccv_dense_matrix_t")
    .smart_ptr_constructor("shared_ptr<ccv_dense_matrix_t>", &std::make_shared<ccv_dense_matrix_t>)
    .function("get_data", &ccv_dense_matrix_t_get_data)
    // TODO: Should use .property() instead of wrapping with getters. https://github.com/kripken/emscripten/issues/4583
    .function("get_rows", &ccv_dense_matrix_t_get_rows)
    .function("get_cols", &ccv_dense_matrix_t_get_cols)
    .function("get_step", &ccv_dense_matrix_t_get_step)
    .function("get_type", &ccv_dense_matrix_t_get_type);

  class_<ccv_array_t>("ccv_array_t");
  register_ccv_array<ccv_rect_t>("ccv_rect_array");

  // TODO: select_overload doesn't work for functions with default args
  function("ccv_read", select_overload<int(val, std::shared_ptr<ccv_dense_matrix_t>&, int)>(&ccvjs_read));
  function("ccv_read", select_overload<int(val, std::shared_ptr<ccv_dense_matrix_t>&)>(&ccvjs_read));
  function("ccv_swt_detect_words", &ccvjs_swt_detect_words);
  constant("CCV_IO_RGB_COLOR", (int)CCV_IO_RGB_COLOR);
  constant("CCV_IO_GRAY", (int)CCV_IO_GRAY);
  constant("CCV_DARK_TO_BRIGHT", (int)CCV_DARK_TO_BRIGHT);
  constant("CCV_BRIGHT_TO_DARK", (int)CCV_BRIGHT_TO_DARK);

  constant("ccv_swt_default_params", ccv_swt_default_params);

  value_object<ccv_rect_t>("ccv_rect_t")
    .field("x", &ccv_rect_t::x)
    .field("y", &ccv_rect_t::y)
    .field("width", &ccv_rect_t::width)
    .field("height", &ccv_rect_t::height);

  register_array<double, 2>("array_double_2"); // For ccv_swt_param_t::same_word_thresh
  value_object<ccv_swt_param_t>("ccv_swt_param_t")
    .field("interval", &ccv_swt_param_t::interval)
    .field("min_neighbors", &ccv_swt_param_t::min_neighbors)
    .field("scale_invariant", &ccv_swt_param_t::scale_invariant)
    .field("direction", &ccv_swt_param_t::direction)
    .field("same_word_thresh", reinterpret_cast<std::array<double, 2> ccv_swt_param_t::*>(&ccv_swt_param_t::same_word_thresh)) // Emscripten doesn't like the type double[2], https://github.com/kripken/emscripten/pull/4510
    .field("size", &ccv_swt_param_t::size)
    .field("low_thresh", &ccv_swt_param_t::low_thresh)
    .field("high_thresh", &ccv_swt_param_t::high_thresh)
    .field("max_height", &ccv_swt_param_t::max_height)
    .field("min_height", &ccv_swt_param_t::min_height)
    .field("min_area", &ccv_swt_param_t::min_area)
    .field("letter_occlude_thresh", &ccv_swt_param_t::letter_occlude_thresh)
    .field("aspect_ratio", &ccv_swt_param_t::aspect_ratio)
    .field("std_ratio", &ccv_swt_param_t::std_ratio)
    .field("thickness_ratio", &ccv_swt_param_t::thickness_ratio)
    .field("height_ratio", &ccv_swt_param_t::height_ratio)
    .field("intensity_thresh", &ccv_swt_param_t::intensity_thresh)
    .field("distance_ratio", &ccv_swt_param_t::distance_ratio)
    .field("intersect_ratio", &ccv_swt_param_t::intersect_ratio)
    .field("elongate_ratio", &ccv_swt_param_t::elongate_ratio)
    .field("letter_thresh", &ccv_swt_param_t::letter_thresh)
    .field("breakdown", &ccv_swt_param_t::breakdown)
    .field("breakdown_ratio", &ccv_swt_param_t::breakdown_ratio);
}
