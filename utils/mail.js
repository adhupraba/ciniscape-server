const nodemailer = require('nodemailer')
const env = require('../utils/env')

// Nodemailer configuration
const transporter = nodemailer.createTransport({
    service: 'hotmail',
    auth: {
        user: env.emailId,
        pass: env.emailPwd
    }
})

// Nodemail email sending request
exports.sendMail = ({ to, subject, text }) => {
    const mailOpt = {
        from: env.emailId,
        to: to,
        subject: subject,
        text: text,
    }

    transporter.sendMail(mailOpt, (err, info) => {
        if (err) {
            console.log(err.message)
        }
    })
}