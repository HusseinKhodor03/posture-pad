#ifndef FSR_READER_H
#define FSR_READER_H

#include "../data/RawDataTypes.h"

namespace FsrReader
{
    void init();
    void readAll(FootData &leftFoot, FootData &rightFoot);
}

#endif
