// useage mongo (login) --eval"var word='bi?tch'" delete.js"

printjson(word)

// use functal
// db.images.remove({'title': {$regex: word }})

// use topics
// db.titles.remove({title: {$regex: word }})
// db.tweets.remove({text: {$regex: word }})
