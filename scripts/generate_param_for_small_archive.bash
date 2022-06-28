CURRENT_PATH=`pwd`
cat <<-EOF > ../smallArchive/spectral_archive.conf
#set -v
# mzxmls
mzxmlfiles= $CURRENT_PATH/../smallArchive/mzxmlfiles

#indexfile=${CURRENT_PATH}/../smallArchive/
#
pepxmls=


rebuild = false
update = false
updaterawdata =
updategt =
updategtlist =
# reconstruction = false

#
use_gpu = false

#
removeprecursor = true
useflankingbins = true

# this should be fixed
inputsource = socket
queryindex = 1579
topn = 10
port = 8710
maxconnection = 10

# this is not used any more
indexstring = IVF256,PQ16
indexstrs = IVF256,PQ16

#tolerance low mass accuracy: 1; high mass accuracy: 15
# 0.03 Th: 1
# 0.45 Th: 15
tolerance = 1

# the background spectra list seed
bgspecseed = 42

# generate files named as dpscore_10000_random_query_.txt ...
saveBackgroundScore = false

EOF
