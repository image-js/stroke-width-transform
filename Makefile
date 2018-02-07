ifeq "" "$(findstring em++,$(CXX))"
$(error You need to install/source emscripten and run with "emmake make")
endif

CXXFLAGS = -std=c++1z \
	--bind \
	--memory-init-file 0 \
	-s EXPORT_NAME=\"'CCVLib'\" \
	-s MODULARIZE=1 \
	-s NO_EXIT_RUNTIME=1 \
	-s TOTAL_MEMORY=$$((2 << 29))

CPPFLAGS = -I"./ccv/lib"

LDFLAGS = -L"./ccv/lib"

LDLIBS = -lccv

.PHONY: all release debug clean

all: release

release: CXXFLAGS += -O3 --llvm-lto 1 -s AGGRESSIVE_VARIABLE_ELIMINATION=1 -s OUTLINING_LIMIT=5000 # TODO --closure 1
release: dist/ccv.js # dist/ccv_wasm.js 

# TODO this target isn't tested and probably doesn't work
# Also you probably need to do `emmake make clean` before building debug if you've already built release
debug: CXXFLAGS += -v -g4 -s ASSERTIONS=1 -s DEMANGLE_SUPPORT=1 -s SAFE_HEAP=1 -s STACK_OVERFLOW_CHECK=1
debug: CXXFLAGS += -Weverything -Wall -Wextra
debug: dist/ccv.js dist/ccv_wasm.js


# Same as dist/ccv.js but uses WASM. Outputs an additional dist/ccv_wasm.wasm file.
dist/ccv_wasm.js: CXXFLAGS += -s WASM=1 -s ALLOW_MEMORY_GROWTH=1 --pre-js src/ccvPreWasm.js
dist/ccv_wasm.js: dist/ccv_wasm.js
	$(CXX) $(CXXFLAGS) $(CPPFLAGS) $(LDFLAGS) ccv_bindings.cpp -o $@ $(LDLIBS)


# TODO rather than a separate dist target we should just load the data files on demand
dist/ccv.js: CPPFLAGS += -s NO_FILESYSTEM=1 --pre-js src/ccvPreAsm.js
dist/ccv.js: ccv_bindings.cpp ccv/lib/libccv.a src/ccvPreAsm.js
	$(CXX) $(CXXFLAGS) $(CPPFLAGS) $(LDFLAGS) ccv_bindings.cpp -o $@ $(LDLIBS)


ccv/lib/libccv.a:
	git submodule update --init
	cd ccv/lib && git checkout stable && emconfigure ./configure --without-cuda && emmake make libccv.a
	mkdir -p dist

clean:
	rm -f dist/*
	#cd external/ccv/lib && make clean
