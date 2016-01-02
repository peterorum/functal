export PKG_CONFIG_PATH=/usr/lib64/pkgconfig:/usr/lib/pkgconfig
export PATH=/usr/bin:$PATH
export LDFLAGS=-L/usr/lib64:/usr/lib
export LD_LIBRARY_PATH=/usr/lib64:/usr/lib
export CPPFLAGS=-I/usr/include

sudo yum-config-manager --enable epel
#sudo yum update -y
sudo yum install -y gcc gcc-c++ glib2-devel.x86_64 libxml2-devel.x86_64 libpng-devel.x86_64 \
libjpeg-turbo-devel.x86_64 gobject-introspection.x86_64 gobject-introspection-devel.x86_64

wget http://ftp.gnome.org/pub/GNOME/sources/libcroco/0.6/libcroco-0.6.8.tar.xz
tar xvfJ libcroco-0.6.8.tar.xz
cd libcroco-0.6.8
./configure --prefix=/usr
make
sudo make install
cd ..

wget http://ftp.gnome.org/pub/GNOME/sources/gdk-pixbuf/2.28/gdk-pixbuf-2.28.2.tar.xz
tar xvfJ gdk-pixbuf-2.28.2.tar.xz
cd gdk-pixbuf-2.28.2
./configure --prefix=/usr --without-libtiff
make
sudo make install
cd ..

sudo yum install -y pixman-devel.x86_64 harfbuzz-devel.x86_64 freetype-devel.x86_64

wget wget http://www.freedesktop.org/software/fontconfig/release/fontconfig-2.10.91.tar.gz
tar xvf fontconfig-2.10.91.tar.gz
cd fontconfig-2.10.91
./configure --prefix=/usr --enable-libxml2
make
sudo make install
cd ..

wget http://cairographics.org/releases/cairo-1.12.14.tar.xz
tar xvfJ cairo-1.12.14.tar.xz
cd cairo-1.12.14
./configure --prefix=/usr
make
sudo make install
cd ..

wget http://ftp.gnome.org/pub/GNOME/sources/pango/1.34/pango-1.34.1.tar.xz
tar xvfJ pango-1.34.1.tar.xz
cd pango-1.34.1
./configure --prefix=/usr
make
sudo make install
cd ..

wget http://ftp.gnome.org/pub/GNOME/sources/librsvg/2.40/librsvg-2.40.6.tar.xz
tar xvfJ librsvg-2.40.6.tar.xz
cd librsvg-2.40.6
./configure --prefix=/usr
make
sudo make install
cd ..

wget http://www.imagemagick.org/download/ImageMagick.tar.gz
tar xvf ImageMagick.tar.gz
cd ImageMagick-6.9.2-10
./configure --prefix=/usr --with-rsvg
make
sudo make install
cd ..

sudo ldconfig /usr/lib