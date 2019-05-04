yum -y install gcc-c++ libpng-devel libjpeg-devel libtiff-devel wget
wget https://downloads.sourceforge.net/project/graphicsmagick/graphicsmagick/1.3.26/GraphicsMagick-1.3.26.tar.gz
tar zxvf GraphicsMagick-1.3.26.tar.gz
cd GraphicsMagick-1.3.26
./configure --prefix=/var/task/graphicsmagick --enable-shared=no --enable-static=yes
make
sudo make install
rm -rf GraphicsMagick-1.3.26
rm GraphicsMagick-1.3.26.tar.gz
cp -R /var/task/graphicsmagick/* .
