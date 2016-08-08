// useage mongo (login) --eval"var word='bi?tch'" delete.js

printjson('deleting ' + word);

db = db.getSiblingDB('functal');
db.images.remove({'title': {$regex: word }});

db = db.getSiblingDB('topics');
db.titles.remove({title: {$regex: word }});
db.tweets.remove({text: {$regex: word }});
