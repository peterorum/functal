size(768, 1024);
smooth();
background(0);


noFill();


for(int i = 0; i < 10000; i++) {

  int x = (int) random(width);
  int y = (int) random(height);

  int w = (int) random(64);
  int h = w;

  strokeWeight(random(8));

  stroke(random(255), random(255),random(255), random(255));

  ellipse(x, y, w, h);

}
