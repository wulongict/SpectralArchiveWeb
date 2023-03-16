cd ../arxiv
spawn-fcgi -p 8710 -n -- ../../../SpectralArchive/build/bin/spectroscape  --config ../smallArchive/spectral_archive.conf
