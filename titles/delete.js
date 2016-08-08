// useage mongo (login) --eval"var word='bi?tch'" delete.js"

printjson(word);

db = db.getSiblingDB('functal');
printjson(db.getCollectionNames());

// db.images.remove({'title': {$regex: word }});

// db = db.getSiblingDB('topics');
// db.titles.remove({title: {$regex: word }});
// db.tweets.remove({text: {$regex: word }});
