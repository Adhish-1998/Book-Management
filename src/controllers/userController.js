const userModel = require("../models/userModel");
const jwt = require("jsonwebtoken");


///<------------------------- req.body key empty validation ------------------------>
const isValid = function (value) {
    if (typeof value === "undefined" || value === null) return false;
    if (typeof value === "string" && value.trim().length === 0) return false;
    return true;
};

//<--------------------Registering User-------------------------->//

const userRegistration = async (req, res) => {
    try {
        let userData = req.body
        
        ///<--------------req validation-------------------------------------------->
        if (Object.keys(userData).length == 0)
        return res.status(400).send({ status: false, msg: "Request Cannot Be Empty" });
        
        let { city, pincode } = userData.address
        
        if (!isValid(userData.title))
            return res.status(400).send({ status: false, message: "title is required" });
        if (!isValid(userData.name))
            return res.status(400).send({ status: false, message: "name is required" });
        if (!isValid(userData.phone))
            return res.status(400).send({ status: false, message: "phone is required" });
        if (!isValid(userData.email))
            return res.status(400).send({ status: false, message: "email is required" });
        if (!isValid(userData.password))
            return res
                .status(400)
                .send({ status: false, message: "password is required" });
        if (!isValid(userData.address))
            return res
                .status(400)
                .send({ status: false, message: "address is required" });

        ////<----------------------- title enum validation ------------------------------->
        let enu = ["Mr", "Mrs", "Miss"];
        if (!enu.includes(userData.title))
            return res
                .status(400)
                .send({ status: false, message: `Please Enter one of these ${enu}` });


        ///<-----------------------------mobile number checking ---------------------------->

        if (!(/^[6-9]\d{9}$/.test(userData.phone))) {
            return res
                .status(400)
                .send({ status: false, message: "Please give 10 digit number starting with (6-9)." });

        }

        let phoneNumChecking = await userModel.findOne({ phone: userData.phone });
        if (phoneNumChecking) {
            return res
                .status(400)
                .send({ status: false, message: "This Phone Number already exist." });
        }

        ///<------------------------ Email validation ---------------------------------------->
        const validateEmail = function (mail) {
            if (/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/.test(mail)) {
                return true;
            }
        };
        if (!validateEmail(userData.email))
            return res
                .status(400)
                .send({ status: false, message: "Incorrect Email !!!" });
        const emailChecking = await userModel.findOne({ email: userData.email });
        if (emailChecking)
            return res
                .status(400)
                .send({ status: false, message: "This Email already exist." });


        ////<----------------------- Password validation ------------------------------->
        const validatePassword = function (password) {
            if (/^[A-Za-z\W0-9]{8,15}$/.test(password)) {
                return true;
            }
        };
        if (!validatePassword(userData.password))
            return res
                .status(400)
                .send({ status: false, message: "Password Should be 8-15 Characters." });

        ////<----------------------- Address validation ------------------------------->

        if (!(/^[A-Za-z]+$/.test(city))) {
            return res
                .status(400)
                .send({ status: false, message: "Please use Alphabets in City." });

        }

        if (!(/^[0-9]{6}$/.test(pincode))) {
            return res
                .status(400)
                .send({ status: false, message: "Please use 6 Digit Numbers in Pincode." });

        }

        ///<-----------------------------created part ---------------------------------->
        const userCreated = await userModel.create(userData);
        return res.status(201).send({ status: true, userdata: userCreated });
    } catch (error) {
        return res.status(500).send({ status: false, message: error.message });
    }
};


//<------------------User Logging in------------------------------>//
const userLogin = async (req, res) => {
    const { email, password } = req.body;
    if (Object.keys(req.body).length == 0)
       return res
            .status(400)
            .send({ status: false, message: "Enter Login Credentials." });

    if (!email) return res.status(400).send({ status: false, msg: "Email Required." });
    if (!password) return res.status(400).send({ status: false, msg: "Password Required." });

    const validateEmail = function (mail) {
        if (/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/.test(mail)) {
            return true;
        }
    };

    if (!validateEmail(email))
        return res
            .status(400)
            .send({ status: false, message: "Incorrect Email !!!" });

    const validatePassword = function (password) {
        if (/^[A-Za-z\W0-9]{8,15}$/.test(password)) {
            return true;
        }
    };

    if (!validatePassword(password))
        return res
            .status(400)
            .send({ status: false, message: "Password Should be 8-15 Characters" });

    let user = await userModel
        .findOne({ email: email, password: password })
        .select({ _id: 1 });

    if (!user)
        return res.status(400).send({
            status: false,
            message: "Incorrect Email or Password !!!",
        });

    let token = jwt.sign(
        {
            userId: user._id,
            iat: Math.floor(Date.now() / 1000),
            exp: Math.floor((Date.now() / 1000) + 180 * 60),
        },
        "Room 1"
    );

    return res
        .status(200)
        .send({ status: true, message: "Login Successfully", token: token });
};

module.exports.userRegistration = userRegistration;
module.exports.userLogin = userLogin;
