const Post = require("../models/postModel")
const User = require("../models/userModel")
const path = require('path')
const fs = require('fs');
const { v4: uuid } = require('uuid');
const HttpError = require('../models/errorModel')



// ---------------------------CREATE POST ------------------------------
// post: api/post
// protected : thatwhy we required a  authmiddleware
const createPost = async (req, res, next) => {
    // res.json("create Post");
    try {
        let { title, category, description } = req.body;
        if (!title || !category || !description || !req.files) {
            return next(new HttpError("Fill in all field and choose thumbnail", 422))
        }

        // if everything is pass then go and get the thumbnail
        const { thumbnail } = req.files;

        // check the file size
        if (thumbnail.size > 2000000) { // 2mb
            return next(new HttpError("Thumbnail too big. file should be less than 2mb.", 422))
        }

        let fileName = thumbnail.name;
        let splittedFileName = fileName.split('.');
        let newFileName = splittedFileName[0] + uuid() + '.' + splittedFileName[splittedFileName.length - 1]; // last index gave the extension
        // now go to upload the thumbnail
        thumbnail.mv(path.join(__dirname, '..', '/uploads', newFileName), async (error) => {
            if (error) {
                return next(new HttpError(err));
            } else { //if all fine then go to create the new post in database
                const newPost = await Post.create({ title, category, description, thumbnail: newFileName, creator: req.user.id }) // remember the req.user we get is from the authorization middleware
                if (!newPost) {
                    return next(new HttpError("post couldn't be created.", 422));
                }

                // lets find the user and increase the post count;
                const currentUser = await User.findById(req.user.id);
                const userPostCount = currentUser.posts + 1;

                await User.findByIdAndUpdate(req.user.id, { posts: userPostCount });

                res.status(201).json(newPost);
            }
        })
    } catch (error) {
        return next(new HttpError(error))
    }
}







// ---------------------------GET ALL POSTS ------------------------------
// get: api/posts
// unprotected
const getPosts = async (req, res, next) => {
    // res.json("get all posts");
    try {
        const posts = await Post.find().sort({ updatedAt: -1 })  // fetch the post in sorted order by the most recent post  
        res.status(200).json(posts);
    } catch (error) {
        return next(new HttpError(error));
    }
}


// -----------------------GET SINGLE POST------------------------------------
// get: api/post/:id
// unprotected
const getPost = async (req, res, next) => {
    // res.json("get single post");
    try {
        const postId = req.params.id;
        const post = await Post.findById(postId);
        if (!post) {
            return next(new HttpError("post not found.", 404));
        }
        res.status(200).json(post);
    } catch (error) {
        return next(new HttpError(error));
    }
}

// -----------------------GET POST by categories------------------------------------
// get: api/posts/categories/:category
// unprotected
const getCatPosts = async (req, res, next) => {
    // res.json("get post by category");
    try {
        // first fetch the category from the req parameter
        const { category } = req.params;
        const catPosts = await Post.find({ category }).sort({ createdAt: -1 })
        if (!catPosts) {
            return next(new HttpError("post in this category not found.", 404));
        }
        // after this send the response to frontend/client
        res.status(200).json(catPosts);

    } catch (error) {
        return next(new HttpError(error));
    }
}

// -----------------------get use/author post-----------------------------------
// get: api/posts/users/:id
// unprotected
const getUserPost = async (req, res, next) => {
    // res.json("get user posts");
    // first fetch the id from the req parameter
    try {
        const { id } = req.params;
        const posts = await Post.find({ creator: id }).sort({ createdAt: -1 })
        // once all these done then send back to the client
        res.status(200).json(posts);
    } catch (error) {
        return next(new HttpError(error));
    }
}

// ----------------------edit post----------------------------------------------
// PATCH: api/posts/:id
// protected
const editPost = async (req, res, next) => {
    // res.json("edit posts");
    try {
        let fileName;
        let newFileName;
        let updatedPost;
        const postId = req.params.id;
        let { title, category, description } = req.body;

        if (!title || !category || (description.length < 12)) { // if the description len is less than 1 2 then it consider as empty
            return next(new HttpError("fill in all fields.", 422));
        }
        const post = await Post.findById(postId);
        if (req.user.id == post.creator) {
            if (!req.files) {
                updatedPost = await Post.findByIdAndUpdate(postId, { title, category, description }, { new: true });
            } else {
                // if postinData is find in the database then we need to delete the current thumbnail and upload the new one


                // get the old post from the database
                const oldPost = await Post.findById(postId);
                //delete old thumbnail from the upload
                if (!oldPost) {
                    return next(new HttpError("Post not found", 404));
                }
                fs.unlink(path.join(__dirname, '..', 'uploads', oldPost.thumbnail), async (error) => {
                    if (error) {
                        return next(new HttpError(err));
                    }
                })
                // upload the new thumbnail
                const { thumbnail } = req.files;
                //check the file size
                if (thumbnail.size > 2000000) {
                    return next(new HttpError("thumbnail too big. should be less than 2mb"), 422)
                }

                // if it is less than 2mb then we fetch the thumbnail name
                fileName = thumbnail.name;
                let splittedFileName = fileName.split('.')
                newFileName = splittedFileName[0] + uuid() + '.' + splittedFileName[splittedFileName.length - 1]
                // here the the 0 index in splitted file  name is the name of file and the last index is the extension of that file.
                // and then move the file to the uploads
                thumbnail.mv(path.join(__dirname, '..', 'uploads', newFileName), async (err) => {
                    if (err) {
                        return next(new HttpError(err))
                    }
                });
                // now when done with the file upload then go ahead then update the new post details we have.
                updatedPost = await Post.findByIdAndUpdate(postId, { title, category, description, thumbnail: newFileName }, { new: true });
            }

            // now we make sure that the updated done are not
            if (!updatedPost) {
                return next(new HttpError("couldn't update post", 400));
            }

            // if the update is done then send the response to the client
            res.status(200).json(updatedPost);
        } else {
            return next(new HttpError("post couldn't be edited"))
        }
    } catch (error) {
        return next(new HttpError(error));
    }
}


// ----------------------delete post----------------------------------------------
// DELETE: api/posts/:id // having the same path as edit post
// protected
const deletePost = async (req, res, next) => {
    // res.json("delete posts");
    try {
        const postId = req.params.id;
        if (!postId) {
            return next(new HttpError("post unavailable", 400));
        }
        // if the post id there then go ahead and then fetch the post 
        const post = await Post.findById(postId);
        // it can be post be there and also theremay be chance of not there is post there we use optional chaining (?.)
        const fileName = post?.thumbnail;

        // before we do any deletion we have to check first and make sure the person who want to delte the post is actual owner of post or not.
        if (req.user.id == post.creator) { // req.user.id come from the auth middle ware

            // delete the thubmnail
            fs.unlink(path.join(__dirname, '..', '/uploads', fileName), async (err) => {
                if (err) {
                    return next(new HttpError(err));
                } else {
                    // if there all things goes well then proceed to delete the post
                    await Post.findByIdAndDelete(postId);
                    // find the user and reduce the current id by 1;
                    const currentUser = await User.findById(req.user.id);
                    const userPostCount = currentUser?.posts - 1;
                    await User.findByIdAndUpdate(req.user.id, { posts: userPostCount });
                    res.json(`Post ${postId} deleted successfully.`)

                }
            })
        } else {
            return next(new HttpError("post couldn't be deleted, 403"))
        }
    } catch (error) {
        return next(new HttpError(error));
    }

}

module.exports = { deletePost, getPosts, editPost, getUserPost, getCatPosts, getPost, getPost, createPost };

