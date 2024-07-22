const User = require('../models/userModel')
const HttpError = require('../models/errorModel')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const { json, response } = require('express')
const fs = require("fs");
const path = require("path")
const {v4: uuid} = require("uuid")
// -----------------------REGISTER USER---------------------------
// POST : api/user/register

// unprotected
const registerUser =  async (req,res,next) => {
    // res.json("Register User")

    try {
        const {name,email,password, password2} = req.body; // fetch the data from front end
        
        // and then check these field are not empty
        if(!name || !email || !password) {
            return next(new HttpError("Fill in all fields.", 422))
        }
        
        const newEmail = email.toLowerCase(); // be sure that the email which come to be smaller case before going to check other case


        // once check the email is in lower case then check that the user already exist or not;
        const emailExists =  await User.findOne({email: newEmail})
        // this will be asynchronous request so write the await keyword before that and also this is the query to find the user in the mongo

        if(emailExists) {
            return next(new HttpError("Email already exist", 422));
        }
        
        
        if((password.trim()).length < 6) {
            return next(new HttpError("Password should be at least 6 character.", 422));
        }

        // if the above is also passed then go to check that the password and confirm password match or not
        if(password != password2) {
            return next(new HttpError("Password do not match.", 422));
        }

        // if all the thing are properly set then we hash the password using the bncryptjs library
        
        // before generating hash we have to generate the salt
        const salt = await bcrypt.genSalt(10) // 10 means how hard the salt is to be made
        const hashedPassword = await bcrypt.hash(password, salt);

        // now we have the name, email , password with hashed so no we are good to go with storing the user in the database.
        const newUser = await User.create({name, email: newEmail, password: hashedPassword});
        
        
        // res.status(201).json(newUser) // means the new response is added (good practice)
        res.status(201).json(`new user ${newUser.email} registered`) // in this the password not get revealed like above code

    } catch (error) {
        return next(new HttpError("User Registration failed.", 422))
    }
}







// -----------------------LOGIN A REGISTERED USER---------------------------
// POST : api/user/login
// unprotected
const loginUser = async (req,res,next) => {
    // res.json("login  User")
    try {
        // first fetch the email & password from the req body
        const {email, password} = req.body;

        //check that email or password is not empty
        if(!email || !password) {
            return next(new HttpError("fill in all fields.",422))    
        }
        const newEmail = email.toLowerCase();
        
        // go and fetch user from the database
        const user = await User.findOne({email: newEmail});
        
        // if the user is not present then show the new error
        if(!user) {
            return next(new HttpError("Invalid credentials.",422)) 
        }   

        // if the user is valid then check the password given will be correct or not
        const comparePass = await bcrypt.compare(password, user.password);
        // here we should compare the given password witht the hashed password which is store in the database bt the help of bcrypt 
         if(!comparePass) { // if the comparison failed then we have to show the error message.
            return next(new HttpError("Invalid credentials.",422))
         }

         // if the password is correct then we send the their token to get login to their account.
         // these are done by the help of jsonwebtoken
         // import the jsonwebtoken
         const {_id: id, name} = user;
        //  now generate the token 
        const token = jwt.sign({id,name},process.env.JWT_SECRET , {expiresIn: "1d"}) // it take the object of payload
        // here we use id, name as payload but we can also use the id,email also as payload
        // and add the secret key also
        // and the last parameter is optional which is expiredtimeof token which here is given is 1day

        // now send the user a sucessfull response
        res.status(200).json({id, token, name}) // here we sent the id, name , token there

    } catch (error) {
        return next(new HttpError("login failed. please check your credential.",422))
    }
}








// -----------------------USER PROFILE---------------------------
// POST : api/user/:id
// protected
const getUser = async (req,res,next) => {
    // res.json("user profile")
    try {
        // lets try to get the id of use of which we are try to.
        const {id} = req.params;
        
        //note: since getUser controller is only for the profile page we could use the req.user to get the current logged in user instead which would be coming from an middleware we'll be creating later. but this work to.

        // fetched the user
        const user = await User.findById(id).select(`-password`); // here be carefull when you fetch the use to not to include the password

        // if you dont get the use then we should 
        if(!user) {
            return next(new HttpError("User not found.",422))
        }
        // and if we get the user then give the status of 200
        res.status(200).json(user);

    } catch (error) {
        return next(new HttpError(error))
    }
}








// -----------------------change user avatar(profile picture)---------------------------
// POST : api/user/change-avatar
// protected
const changeAvatar = async (req,res,next) => {
    // res.json("Register User")
    try { 
        // this is for testing purpose
        // res.json(req.files)
        // console.log(req.files)

        if(!req.files.avatar) {
            return next(new HttpError("please choose an image" , 422))
        }

        // if the image is there then first fetch the user from the database
        const user = await User.findById(req.user.id)

        // delete the old avatar if exists
        //to achieve this bring modules from node names => {fs,path}\
        // all these all import at top
        if(user.avatar) { // if avatar exists in the database then we going to delete the avatar
            fs.unlink(path.join(__dirname,'..', 'uploads', user.avatar), (error) => { // this function take the call back fun if there is any error then show that error.
                if(error) {
                    return next(new HttpError(err));
                }
            }) // here we go to our uplaods folder and there we delete the image
        }
         
        // now go ahead and work on the new file which is to be uploaded as avatar
        
        // first extract the avatar from the request files
        const {avatar} = req.files;
        //check the file size
        if(avatar.size > 500000) {
            return next(new HttpError(error))
        }
        
        // if the file size is ok then go to change the name
        let fileName;
        fileName = avatar.name;
        let splittedFilename = fileName.split('.');
        let newFilename = splittedFilename[0] + uuid() + '.' + splittedFilename[splittedFilename.length-1]
        // in above case we the new file name we take the first name from old photo and set the random value after the name so that there is no duplicacy there and then add the extension whcih was at last array index old file.
        
        // then upload the file 
        avatar.mv(path.join(__dirname, '..', 'uploads', newFilename), async (error) => {
            if(error) {
                return next(new HttpError(error));
            }

            // once the uplaod succeed go aheadd and communicate to the database
            const updatedAvatar = await User.findByIdAndUpdate(req.user.id, {avatar: newFilename}, {new: true}); // new ko baad me dekha jayega.

            if(!updatedAvatar) { // if the updated avatar does not work
                return next(new HttpError("Avatar couldn't be changed"), 422);
            }
            // other wise if all the things goes well then send the successful response
            res.status(200).json(updatedAvatar);
        })

        // without auth middleware the id dont work here in this

    } catch (error) {
        return next(new HttpError("profile picture too big. should be less than 500kb"));
    }
}







// -----------------------edit the user details(from profile)---------------------------
// POST : api/user/edit-user
// protected
const editUser = async (req,res,next) => {
    // res.json("Edit user Details")
    try {
        // fetch the data from the request
        const {name, email, currentPassword, newPassword, newConfirmPassword} = req.body
        if(!name || !email || !currentPassword || !newPassword) {
            return next(new HttpError("Fill in all fields.", 422));
        }

        // get the user from database
        const user = await User.findById(req.user.id); // doubt
        if(!user) {
            return next(new HttpError("User not found.",403));
        }
        // make sure new email does not already exist
        const emailExists = await User.findOne({email});

        // we want to update other details with/without changing the email (which is a unique id because we use it to login)
        if(emailExists && (emailExists._id != req.user.id)) {
            return next(new HttpError("Email is already exist.", 422))
        }

        // if these things are done then compare the current password with the db password
        const validateUserPassword = await bcrypt.compare(currentPassword, user.password);
        if(!validateUserPassword) {
            return next(new HttpError("Invalid current password", 422));
        }

        // compare the new password
        if(newPassword !== newConfirmPassword) {
            return next(new HttpError("New password do not match.", 422));
        }

        // if the new password do match with confirm new passowrd then we go to hashed it
        // hash the new password
        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(newPassword, salt);

        // update the user info in database
        const newInfo = await User.findByIdAndUpdate(req.user.id, {name,email,password: hash}, {new: true}) // set the new to true so that it return the newly updated newly updated userinfo.

        // now after that send the response of user
        res.status(200).json(newInfo);
    } catch (error) {
        return next(new HttpError(error))
    }
}







// -----------------------GET AUTHORS---------------------------
// POST : api/user/authors
// unprotected
const getAuthors = async (req,res,next) => {
    // res.json("get all users/authors")
    try {
        const authors = await User.find().select('-password') // here when we find all the authors then we need to remove the password from it need to private.

        // send the response
        res.json(authors);
    } catch (error) {
        return next(new HttpError(error))
    }
}







module.exports = {registerUser, loginUser, getUser, changeAvatar, editUser, getAuthors}


