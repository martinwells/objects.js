#!/bin/bash
PLAYCRAFT_LIB=../src
OUT_FILE=../gamecore.js
OUT_MIN_FILE=../gamecore.min.js

# empty it out
> ${OUT_FILE}

cat $PLAYCRAFT_LIB/gamecore.js >> ${OUT_FILE}
cat $PLAYCRAFT_LIB/class.js >> ${OUT_FILE}
cat $PLAYCRAFT_LIB/base.js >> ${OUT_FILE}
cat $PLAYCRAFT_LIB/device.js >> ${OUT_FILE}
cat $PLAYCRAFT_LIB/hashlist.js >> ${OUT_FILE}
cat $PLAYCRAFT_LIB/jhashtable.js >> ${OUT_FILE}
cat $PLAYCRAFT_LIB/linkedlist.js >> ${OUT_FILE}
cat $PLAYCRAFT_LIB/perf.js >> ${OUT_FILE}
cat $PLAYCRAFT_LIB/pooled.js >> ${OUT_FILE}
cat $PLAYCRAFT_LIB/stacktrace.js >> ${OUT_FILE}

> ${OUT_MIN_FILE}
java -jar yuicompressor-2.4.7.jar ${OUT_FILE} -v -o ${OUT_MIN_FILE}
