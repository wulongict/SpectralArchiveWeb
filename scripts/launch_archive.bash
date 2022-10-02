cd ../arxiv
spawn-fcgi -p 8710 -n -- ../../../SpectralArchive/build/bin/fastcgi_similarity.fcgi  --config ../smallArchive/spectral_archive.conf
