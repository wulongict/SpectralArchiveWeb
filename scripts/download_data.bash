#!/bin/bash
#
# Download test some data from PRIDE.

# The data should be converted into mzXML format and searched to get PSMs in pep.xml file format.

URL=http://ftp.ebi.ac.uk/pride-archive/2014/04/PXD000561/
for i in `seq -f "%02g" 1 24`;
do 
	echo downloading Adult_Adrenalgland_Gel_Elite_49_f$i.raw
	wget -nc ${URL}Adult_Adrenalgland_Gel_Elite_49_f$i.raw
done
