const bookModel = require('../models/bookModel')
const userModel = require('../models/userModel')
const ObjectId = require('mongoose').Types.ObjectId
const isbn = require('isbn-validate')                     // to validate 10 digit isbn  
const {checksum}  = require('isbn-validation')              // to validate 13 digit isbn


/*############################################ POST BOOKS ##########################################################*/

let createBookDocument = async (req, res) => {
    try {
        let data = req.body

        let {
            title,
            excerpt,
            userId,                 
            ISBN,
            category,
            subcategory,
            releasedAt

        } = data

        if (Object.keys(data).length == 0) {
            return res.status(400).send({ status: false, msg: "Please provide necessary Book Details" })
        }


        
        if (!title || !title.match(/^[a-zA-Z0-9]/g)) {
            return res.status(400).send({ status: false, msg: "Title is required" })
        }

        if (!excerpt || !excerpt.match(/^[a-zA-Z0-9]/g)) {
            return res.status(400).send({ status: false, msg: "Excerpt is required" })
        }

        if (!userId) {
            return res.status(400).send({ status: false, msg: "User Id is required" })
        }

        if (!ObjectId.isValid(userId)) {
            return res.status(400).send({ status: false, msg: "User Id is Invalid" })
        }

        if (!category || !category.match(/^[a-zA-Z0-9]/g)) {
            return res.status(400).send({ status: false, msg: "Category is required" })
        }

        if (!ISBN) {
            return res.status(400).send({ status: false, msg: "ISBN is required" })
        }

        if (!subcategory || !subcategory.match(/^[a-zA-Z0-9]/g)) {
            return res.status(400).send({ status: false, msg: "Subcategory is required" })
        }

        if (!releasedAt || !releasedAt.match(/^(\d{4})-(0[1-9]|1[0-2])-(0[1-9]|1\d|2\d|3[01])$/)) {
            return res.status(400).send({ status: false, msg: "releasedAt is required in the format('YYYY-MM-DD)" })
        }

        let obj = {}

        obj.title = data.title.trim().split(" ").filter(word => word).join(" ")
        obj.excerpt = data.excerpt.trim().split(" ").filter(word => word).join(" ")
        obj.category = data.category.trim().split(" ").filter(word => word).join(" ")
        obj.subcategory = data.subcategory
        obj.userId = data.userId
        obj.ISBN = data.ISBN.trim().split("-").filter(word => word).join("")
        obj.reviews = data.reviews
        obj.isDeleted = data.isDeleted
        obj.releasedAt = data.releasedAt

        if (!isbn.Validate(obj.ISBN)) {
            if (!checksum(obj.ISBN)) {
                return res.status(400).send({ status: false, msg: "ISBN is Invalid" })
            }
        }


        const titleExist = await bookModel.findOne({ title: obj.title })

        if (titleExist) {
            return res.status(409).send({ status: false, msg: "Title already exits" })
        }

        const isbnExist = await bookModel.findOne({ ISBN: obj.ISBN })

        if (isbnExist) {
            return res.status(409).send({ status: false, msg: "ISBN already exits" })
        }


        let validId = await userModel.findById(userId)
        if (!validId) {
            return res.status(400).send({ status: false, msg: 'userId is not Valid Id' })
        }

        let savedData = await bookModel.create(obj)
        return res.status(201).send({ status: true, data: savedData })

    }
    catch (err) {
        console.log(err)
        return res.status(500).send({ status: false, msg: err.message })

    }
}



/*############################################ GET BOOK ##########################################################*/

const getBook = async (req, res) => {
  try {
    const detailFromQuery = req.query;
    //console.log(detailFromQuery)
    //console.log(typeof detailFromQuery.category)
    // if (Object.keys(detailFromQuery).length === 0) {
    //   res.status(400).send({ status: false, msg: "Please Enter filter" });
    //   return;
    // }
    //let loggedIn = req.loggedIn
    //  if(!detailFromQuery.userId.trim()){
    //      res.status(400).send({ status: false, msg: "Please Enter user id" });
    //    return;
    //  }
    // if(detailFromQuery.category.trim().length === 0){
    //     res.status(400).send({ status: false, msg: "Please Enter category" });
    //   return;
    // }
    // if(!detailFromQuery.subcategory.trim()){
    //     res.status(400).send({ status: false, msg: "Please Enter subcategory" });
    //   return;
    // }
    let filter = {
      isDeleted: false
    };
    if (detailFromQuery.userId) {
      filter._id = detailFromQuery.userId.trim();
    }
    if (detailFromQuery.category) {
      filter.category = detailFromQuery.category.trim();
    }
    if (detailFromQuery.subcategory) {
      let subCategoryArr = detailFromQuery.subcategory.split(',').map(el=>el.trim());
      filter.subcategory = {$in: subCategoryArr}
    }
    const books = await bookModel
      .find(filter)
      .sort({ title: 1 })
      .select({ ISBN: 0, subcategory: 0, deletedAt: 0, isDeleted: 0 });
    if (books.length === 0) {
      res.status(404).send({ status: false, msg: "No book found" });
      return;
    }
    return res.status(200).send({ status: true, message: "Success", data: books })
  }

catch(err){
  return res.status(500).send({ status: false, message: err.message })
}
}
const getBookById = async (req, res) => {
    const bookId = req.params.bookId;
    console.log(typeof bookId)
    if (bookId.length === 0) { // empty string is falsy
        return res.status(400).send({ status: false, msg: 'Please give bookId' })
    }
    if (bookId.trim().length > 24) {
        return res.status(400).send({ status: false, msg: 'Please give valid bookId' })
    }
    const filteredBookId = bookId.trim()
    const book = await bookModel.findOne({_id:filteredBookId,isDeleted: false});
    if(!book){
      return res.status(404).send({status: false, message: 'Book not found'})
    }
    // console.log(book)
    if (book.reviews === 0) {
        book._doc.reviewsData = []
    }
    return res.status(200).send({ status: true, message: "Success", data: book })

}



/*############################################ UPDATE BOOKS BY BOOK-ID ##########################################################*/

const updateBook = async (req, res) => {
    try {
        let Id = req.params.bookId

        if (!ObjectId.isValid(Id)) {
            return res.status(400).send({ status: false, msg: "Book Id is Invalid" })
        }

        let data = req.body
        let { title, excerpt, releasedAt, ISBN } = data

        let obj = {}

        if (title) {
            
            if (!title.match(/^[a-zA-Z0-9]/g)) {
                return res.status(404).send({ status: false, msg: "Please do provide appropriate Title" })
            }
            obj.title = data.title.trim().split(" ").filter(word => word).join(" ")
        }

        
        if (excerpt) {
            if (!excerpt.match(/^[a-zA-Z0-9]/g)) {
                return res.status(404).send({ status: false, msg: "Please do provide appropriate Excerpt" })
            }
            obj.excerpt = data.excerpt.trim().split(" ").filter(word => word).join(" ")
        }


        if (ISBN) {
            obj.ISBN = ISBN.trim().split("-").filter(word => word).join("")
            if (!isbn.Validate(obj.ISBN)) {
                if (!checksum(obj.ISBN)) {
                    return res.status(400).send({ status: false, msg: "ISBN is Invalid" })
                }
            }
        }

        if (releasedAt) {
            if (!releasedAt.match(/^(\d{4})-(0[1-9]|1[0-2])-(0[1-9]|1\d|2\d|3[01])$/)) {
                return res.status(400).send({ status: false, msg: "releasedAt is required in the format('YYYY-MM-DD)" })
            }
            obj.releasedAt = data.releasedAt
        }

        let book = await bookModel.findById(Id)
        if (!book) {
            return res.status(404).send({ status: false, msg: `User with Id- ${Id} is not present in collection` })
        }
        if (book.isDeleted == true) {
            return res.status(404).send({ status: false, msg: 'Document already deleted' })
        }

        const titleExist = await bookModel.findOne({ title: obj.title })

        if (titleExist) {
            return res.status(409).send({ status: false, msg: "Title already exits" })
        }

        const isbnExist = await bookModel.findOne({ ISBN: obj.ISBN })

        if (isbnExist) {
            return res.status(409).send({ status: false, msg: "ISBN already exist" })
        }


        let updatedBook = await bookModel.findOneAndUpdate(
            { _id: Id, isDeleted: false }, obj,
            { returnDocument: 'after' },
        )

        return res.status(200).send({ status: true, message: 'Success', data: updatedBook })
    }
    catch (err) {
        return res.status(500).send({ status: false, message: err.message })
    }
}

/*############################################ DELETE BY BOOK-ID ##########################################################*/

const deletedbook = async (req, res) => {
    try {

        let bookId = req.params.bookId

        if (!bookId) {
            return res.status(400).send({ status: false, message: "book id is empty" })
        }
        if (!ObjectId.isValid(bookId)) {
            return res.status(400).send({ status: false, message: "bookid format invalid" })
        }

        let findid = await bookModel.findOne({ _id: bookId, isDeleted: false })

        if (!findid) {
            return res.status(400).send({ status: false, message: "The requested Book is unavailable" })
        }

        let deletedData = await bookModel.updateOne({ _id: bookId }, { $set: { isDeleted: true , deletedAt: Date.now()} })
        return res.status(200).send({ status: true, message: `Delete successful for Book Id :${bookId}` })

    } catch (error) {
        res.status(500).send({ status: false, message: error })
    }
}


module.exports.createBookDocument = createBookDocument;
module.exports.getBook = getBook;
module.exports.getBookById = getBookById;
module.exports.updateBook = updateBook;
module.exports.deletedbook = deletedbook;