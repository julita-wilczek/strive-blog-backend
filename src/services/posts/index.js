import express, { response } from "express" 
import uniqid from "uniqid"
import createHttpError from "http-errors"
import { validationResult } from "express-validator"
import { newPostValidation } from "./validation.js"
import { getPosts, updatePosts } from "../../library/fs-tools.js"
import { saveCovers } from "../../library/fs-tools.js"
import multer from "multer"


const postsRouter = express.Router()

postsRouter.post("/", newPostValidation, async (request, response, next) => { 
    try { 
        const errorsList = validationResult(request)
        const posts = await getPosts()
        if (errorsList.isEmpty()) {
            const newPost = {...request.body, createdAt: new Date(), _id: uniqid()}
            posts.push(newPost)
            await updatePosts(posts)
            response.status(201).send(newPost)
        } else {
            next(createHttpError(400, "Big mistake. Big. HUGE!", {errorsList}))
        }

    } catch(error) {
        next(error)
    } 

})

postsRouter.get("/", async (request, response, next) => {
    try {
        const posts = await getPosts()
        if (request.query && request.query.category){
            const filteredByCategory = posts.filter(post => post.category === request.query.category)
            response.send(filteredByCategory)
            // next(createHttpError(404, "No such category"))
        } else if (request.query && request.query.title) {
            const filteredByTitle = posts.filter(post => post.title.toLowerCase().includes(request.query.title.toLowerCase()))
            response.send(filteredByTitle)
            // next(createHttpError(404, "No such title"))
        } else {
            response.send(posts)
        }
        
    } catch(error) {
        next(error)
    }

}) 

postsRouter.get("/:postId", async (request, response, next) => { 
    try {
        const posts = await getPosts()
        const requestedPost = posts.find(post => post._id === request.params.postId)
        if (requestedPost) {
            response.send(requestedPost)
        } else {
            next(createHttpError(404, "This is not the post you're looking for.",))
        }
    } catch(error) {
        next(error)
    }


}) 

postsRouter.put("/:postId", async (request, response, next) => { 

    try {
    const posts = await getPosts()
    const index = posts.findIndex(post => post._id === request.params.postId)
    if (index !== -1) {
        const oldPost = posts[index]
        const updatedPost = {...oldPost, ...request.body, updatedAt: new Date()}
        posts[index] = updatedPost
        await updatePosts(posts)
        response.send(updatedPost)
    } else {
        next(createHttpError(404, "This is not the post you're looking for."))
    }
    } catch(error) {
        next(error)
    }




}) 
postsRouter.delete("/:postId", async (request, response, next) => {
    try {
        const posts = await getPosts()
        const requestedPost = posts.find(post => post._id === request.params.postId)
        if (requestedPost) {
        const remainingPosts = posts.filter(post => post._id !== request.params.postId)
        await updatePosts(remainingPosts)
        response.status(200).send({message: "Post deleted"})
    } else {
        next(createHttpError(404, "This post doesn't exist"))
    }
    } catch(error) {
        next(error)
    }

})

postsRouter.post("/:postId/uploadCover", multer().single("cover"), async (req, res, next) => {
    try {
    const postId = req.params.postId
    const posts = await getPosts()
    const index = posts.findIndex(post => post._id === postId)
    if (index !== -1) {
        await saveCovers(`${postId}.jpg`, req.file.buffer)
        const oldPost = posts[index]
        const updatedPost = {...oldPost, cover: `http://localhost:3001/img/posts/${postId}.jpg`, updatedAt: new Date()}
        posts[index] = updatedPost
        await updatePosts(posts)
        res.send({message: "Cover uploaded"})
    } else {
        next(createHttpError(404, "This is not the author you're looking for."))
    }
    } catch(error) {
        next(error)
    }
})

export default postsRouter

/*
POST /blogPosts/:id/uploadCover, uploads a picture (save as idOfTheBlogPost.jpg in the public/img/blogPosts folder)
 for the blog post specified by the id. Store the newly created URL into the corresponding post in blogPosts.json

*/