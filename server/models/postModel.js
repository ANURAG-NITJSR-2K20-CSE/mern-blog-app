const { Schema, model } = require('mongoose')
const { schema } = require('./userModel')

const postSchema = new Schema({
    title: { type: String, required: true },
    category: { type: String, enum: ["Agriculture", "Business", "Education", "Entertainment", "Art", "Investment", "Uncategorized", "Weather"], message: "{VALUE is not supported}" },
    description: { type: String, required: true },
    creator: { type: Schema.Types.ObjectId, ref: "User"}, // this is a reference to the user
    thumbnail: {type: String, required: true},
},{timestamps : true})

module.exports = model("Post", postSchema);

