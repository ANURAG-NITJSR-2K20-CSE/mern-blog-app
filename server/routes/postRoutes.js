const {Router} = require('express');
const { createPost, getPosts,getPost, getCatPosts, getUserPost, editPost, deletePost } = require('../controllers/postControllers');

const authMiddleware = require('../middleware/authMiddleware')
const router = Router()

// first we need to import all the post controllers

router.post('/',authMiddleware,createPost)
router.get('/',getPosts)
router.get('/:id',getPost)
router.get('/categories/:category', getCatPosts)
router.get('/users/:id', getUserPost)
router.patch('/:id',authMiddleware, editPost) 
router.delete('/:id',authMiddleware, deletePost)

// here you notice that last two router are same but there is different methods









// router.get('/', (req, res, next) => {
//     res.json("this is the post route")
// })


module.exports = router;