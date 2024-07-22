const {Router} = require('express')

const authMiddleware = require('../middleware/authMiddleware')

// lets import all userControllers here
const {registerUser, loginUser, getUser, changeAvatar, editUser, getAuthors} = require('../controllers/userControllers')

const router = Router()

router.post('/register', registerUser);
router.post('/login', loginUser);
router.get('/:id', getUser);
router.get('/', getAuthors);
router.post('/change-avatar', authMiddleware, changeAvatar); // this is protected route so before proceeding the change avatar you have to go through the authmiddle ware if you get validated then change the avatar
router.patch('/edit-user', authMiddleware, editUser);

// router.get('/', (req, res, next) => {
//     res.json("this is the user route")
// })


module.exports = router;