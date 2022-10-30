/*############################################ POST BOOKS ##########################################################*/

const bookModel = require('../models/bookModel')
const userModel = require('../models/userModel')
const reviewModel = require('../models/reviewModel')
const ObjectId = require('mongoose').Types.ObjectId
const isbn = require('isbn-validate')                     // to validate 10 digit isbn  
const { checksum } = require('isbn-validation')              // to validate 13 digit isbn
const {uploadFile} = require('../.aws/config')


const isValid = function (value) {
  if (typeof value === "undefined" || value === null) return false;
  if (typeof value === "string" && value.trim().length === 0) return false;
  return true;
};


let createBookDocument = async (req, res) => {
  try {
    let bookDeatils = req.body;
    let { title, excerpt, userId, ISBN, category, subcategory, releasedAt } = bookDeatils;
    let files = req.files
    let obj = {};
    if(files && files.length > 0) {
      let uploadUrl = await uploadFile(files[0])
      obj.bookCover = uploadUrl

    }
    if (Object.keys(bookDeatils).length == 0) {
      return res
        .status(400)
        .send({ status: false, message: "Please Provide Necessary Book Details" });
    }

    if (!isValid(title)) {
      return res.status(400).send({ status: false, message: "Title is required" });
    }

    obj.title = title
      .trim()
      .split(" ")
      .filter((word) => word)
      .join(" ");

    const titleExist = await bookModel.findOne({ title: obj.title });
    if (titleExist) {
      return res
        .status(409)
        .send({ status: false, message: "Title already exists" });
    }

    if (!isValid(excerpt)) {
      return res
        .status(400)
        .send({ status: false, message: "Excerpt is required" });
    }
    obj.excerpt = excerpt
      .trim()
      .split(" ")
      .filter((word) => word)
      .join(" ");

    if (!userId) {
      return res
        .status(400)
        .send({ status: false, message: "User Id is required" });
    }

    if (!ObjectId.isValid(userId)) {
      return res.status(400).send({ status: false, message: "User Id is Invalid" });
    }
    obj.userId = userId;
    if (!isValid(category)) {
      return res
        .status(400)
        .send({ status: false, message: "Category is required" });
    }
    obj.category = category
      .trim()
      .split(" ")
      .filter((word) => word)
      .join(" ");

    if (!isValid(ISBN)) {
      return res.status(400).send({ status: false, message: "ISBN is required" });
    }

    obj.ISBN = ISBN.trim()
      .split("-")
      .filter((word) => word)
      .join("");

    if (!isbn.Validate(obj.ISBN)) {
      if (!checksum(obj.ISBN)) {
        return res
          .status(400)
          .send({ status: false, messasge: "ISBN is Invalid" });
      }
    }

    if (!isValid(subcategory)) {
      return res
        .status(400)
        .send({ status: false, message: "Subcategory is required" });
    }

    obj.subcategory = subcategory;


    const isIsbnExist = await bookModel.findOne({ ISBN: obj.ISBN });
    if (isIsbnExist) {
      return res.status(409).send({ status: false, message: "ISBN already exists" });
    }

    if (!isValid(releasedAt)) {
      return res
        .status(400)
        .send({ status: false, message: "releasedAt is required" });
    }
    if (!(/^((\d{4}[\/-])(\d{2}[\/-])(\d{2}))$/.test(releasedAt))) {
      return res
        .status(400)
        .send({ status: false, message: "Enter Release Date in YYYY-MM-DD format!!!" });
    }
    obj.releasedAt = releasedAt;


    let validId = await userModel.findById(userId);
    if (!validId) {
      return res
        .status(400)
        .send({ status: false, message: "userId is not Valid Id" });
    }
    let savedData = await bookModel.create(obj);
    return res.status(201).send({ status: true, message: 'Success', data: savedData });
  } catch (err) {
    return res.status(500).send({ status: false, message: err.message });
  }
};


/*############################################ GET BOOK ##########################################################*/

const getBook = async (req, res) => {
  try {
    const detailFromQuery = req.query;

    let loggedIn = req.loggedIn

    let filter = {
      userId: loggedIn, isDeleted: false,
    };
    if (detailFromQuery.userId) {
      if (!ObjectId.isValid(detailFromQuery.userId)) {
        return res.status(400).send({ status: false, message: "User Id is Invalid" });
      }
    }

    if (detailFromQuery.userId) {
      if (detailFromQuery.userId.trim().length === 0) {
        res.status(400).send({ status: false, msg: "Please Enter user id" });
        return;
      }
      filter.userId = detailFromQuery.userId.trim();
    }
    if (detailFromQuery.category) {
      if (detailFromQuery.category.trim().length === 0) {
        res.status(400).send({ status: false, msg: "Please Enter category" });
        return;
      }
      filter.category = detailFromQuery.category.trim();
    }
    if (detailFromQuery.subcategory) {
      if (detailFromQuery.subcategory.trim().length === 0) {
        res.status(400).send({ status: false, msg: "Please Enter subcategory" });
        return;
      }
      let subCategoryArr = detailFromQuery.subcategory
        .split(",")
        .map((el) => el.trim());
      filter.subcategory = { $in: subCategoryArr };
    }
    const books = await bookModel
      .find(filter)
      .sort({ title: 1 })
      .select({ ISBN: 0, subcategory: 0, deletedAt: 0, isDeleted: 0 });
    if (books.length === 0) {
      res.status(404).send({ status: false, msg: "No book found" });
      return;
    }
    return res
      .status(200)
      .send({ status: true, message: "Success", data: books });
  } catch (err) {
    return res.status(500).send({ status: false, message: err.message });
  }
};


const getBookById = async (req, res) => {
  try {
    const bookId = req.params.bookId;

    if (!ObjectId.isValid(bookId)) {
      return res.status(400).send({ status: false, message: "BookId is Invalid" });
    }

    const filteredBookId = bookId
    const book = await bookModel.findOne({ _id: filteredBookId, isDeleted: false });
    if (!book) {
      return res.status(404).send({ status: false, message: 'Book not found' })
    }

    let reviews = await reviewModel.find({ bookId: book._id, isDeleted: false }).select({ isDeleted: 0, createdAt: 0, updatedAt: 0, __v: 0 })

    if (book.reviews === 0) book._doc.reviewsData = [];
    else book._doc.reviewsData = reviews
    return res.status(200).send({ status: true, message: "Success", data: book })
  }
  catch (err) {
    return res.status(500).send({ status: false, message: err.message });
  }
}



/*############################################ UPDATE BOOKS BY BOOK-ID ##########################################################*/


const updateBook = async (req, res) => {
  try {
    let bookId = req.params.bookId;

    if (!ObjectId.isValid(bookId)) {
      return res.status(400).send({ status: false, message: "Book Id is Invalid" });
    }

    let bookDetailToUpdate = req.body;
    if (Object.keys(bookDetailToUpdate).length === 0) {
      return res.status(400).send({ status: false, message: 'Please Provide Details for Update' })
    }

    let { title, excerpt, releasedAt, ISBN } = bookDetailToUpdate;

    let bookObject = {};
    if (Object.keys(bookDetailToUpdate).indexOf('title') !== -1) {
      if (title.trim().length === 0) {
        return res.status(400).send({ status: false, message: 'Please Enter title' })
      }
     
      let trimmedTitle = title
        .trim()
        .split(" ")
        .filter((word) => word)
        .join(" ")
      const isTitleExist = await bookModel.findOne({ title: trimmedTitle });
      if (isTitleExist) {
        return res
          .status(409)
          .send({ status: false, message: "Title already exists" });
      }
      bookObject.title = trimmedTitle;
    }
  
    if (Object.keys(bookDetailToUpdate).indexOf('excerpt') !== -1) {
      if (excerpt.length == 0) {
        return res.status(400).send({ status: false, message: 'Please Enter excerpt' })
      }
      bookObject.excerpt = excerpt
        .trim()
        .split(" ")
        .filter((word) => word)
        .join(" ");
    }
    if (Object.keys(bookDetailToUpdate).indexOf("ISBN") !== -1) {
      if (ISBN.length == 0) {
        return res.status(400).send({ status: false, message: 'Please Enter ISBN' })
      }
      let trimmedISBN = ISBN.trim()
        .split("-")
        .filter((word) => word)
        .join("");

      if (!isbn.Validate(trimmedISBN)) {
        if (!checksum(trimmedISBN)) {
          return res
            .status(400)
            .send({ status: false, messasge: "ISBN is Invalid" });
        }
      }

      const isIsbnExist = await bookModel.findOne({ ISBN: trimmedISBN });
      if (isIsbnExist) {
        return res.status(409).send({ status: false, message: "ISBN already exists" });
      }
      bookObject.ISBN = trimmedISBN;

    }

    if (Object.keys(bookDetailToUpdate).indexOf("releasedAt") !== -1) {
      
      if (!(releasedAt)) {
     
        return res
          .status(400)
          .send({ status: false, message: "Enter Date in YYYY-MM-DD format!!!" });
      }
      
    if (!(/^((\d{4}[\/-])(\d{2}[\/-])(\d{2}))$/.test(releasedAt))) {
     
      return res
        .status(400)
        .send({ status: false, message: "Enter Date in YYYY-MM-DD format!!!" });
    }
  
    bookObject.releasedAt = releasedAt
  }



    let book = await bookModel.findOne({ _id: bookId, isDeleted: false });
    if (!book) {
      return res
        .status(404)
        .send({
          status: false,
          message: 'Book not found',
        });
    }
    
    let updatedbookDetail = await bookModel.findOneAndUpdate(
      { _id: book._id },
      bookObject,
      { returnDocument: "after" }
    );

    return res
      .status(200)
      .send({ status: true, message: "Success", data: updatedbookDetail });
  } catch (err) {
    return res.status(500).send({ status: false, message: err.message });
  }
};


/*############################################ DELETE BY BOOK-ID ##########################################################*/

const deletedbook = async (req, res) => {
  try {

    let bookId = req.params.bookId

    if (!ObjectId.isValid(bookId)) {
      return res.status(400).send({ status: false, message: "Invalid Book Id." })
    }

    let findid = await bookModel.findOne({ _id: bookId, isDeleted: false })

    if (!findid) {
      return res.status(404).send({ status: false, message: "The Requested Book is Unavailable" })
    }

    let deletedData = await bookModel.findOneAndUpdate({ _id: bookId }, { $set: { isDeleted: true, deletedAt: Date.now() } })
    return res.status(200).send({ status: true, message: `${deletedData.title} Successfully Deleted.` })

  } catch (error) {
    res.status(500).send({ status: false, message: error })
  }
}






module.exports.createBookDocument = createBookDocument;
module.exports.getBook = getBook;
module.exports.getBookById = getBookById;
module.exports.updateBook = updateBook;
module.exports.deletedbook = deletedbook;