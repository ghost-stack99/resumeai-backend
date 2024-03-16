// Import necessary modules
const express = require('express');
const multer = require('multer');
const pdfParse = require('pdf-parse');
const { createReadStream } = require('fs');
const OpenAI = require( "openai");
require('dotenv').config();
console.log(process.env.API_KEY)
const openAI = new OpenAI({ apiKey: process.env.API_KEY })
const cors = require('cors');
const puppeteer = require('puppeteer');
const { readFileSync } = require('fs');
const crypto = require('crypto');
const serverless = require('serverless-http')


// Initialize Express app
const app = express();
const port = process.env.PORT || 3410; 
app.use(cors());
// app.use('/.netlify/functions/api',router);



// Initialize Multer for file upload and report
const upload = multer({ dest: 'uploads/' });



// Your routes and other middleware definitions go here

// app.listen(port
// , () => {
//     console.log('Server is running on port ,' + port );
// });


// Serve static files
app.get('/',(req,res)=>{
  res.send("app is running")
})
app.use(express());

// Define route for file upload
app.post('/upload', upload.single('resume'), async (req, res) => {
    try {
        // Define default data
        var defaultName = "arpan";
        var defaultJob = "Financial Analyst";

        // Check if req.body exists and assign values accordingly
        var name = req.body && req.body.name ? req.body.name : defaultName;
        var job = req.body && req.body.job ? req.body.job : defaultJob;

        console.log(req.file.path);
        const token = name + "-" + crypto.randomBytes(2).toString("hex") + "-Report-By-EDEC";
        const resumeText = await extractText(req.file.path);
        const analysis = await analyzeResume(resumeText , job);
        console.log(analysis)

        // Await the generatePDF function
        await generatePDF(analysis, token, name);
        app.get('/reports/:fileName', (req, res) => {
          const fileName = req.params.fileName;
          const file = `./reports/${fileName}.pdf`;
        
          res.download(file, (err) => {
              if (err) {
                  res.status(404).json({ error: 'File not found' });
              }
          });
        });
        
        // Delay sending the response by 0.5s
          res.send({ url: token });

       
        
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');

    }

   
});




// Function to extract text from PDF
async function extractText(filePath) {
    const dataBuffer = createReadStream(filePath);
    //console.log(dataBuffer)
    const data = await pdfParse(filePath);
    //console.log(data.text)
    return data.text;
}



// Function to analyze resume using GPT-3.5
// Assuming you have already set up your OpenAI API key and imported necessary libraries
// Function to analyze resume using GPT-3.5
async function analyzeResume(resumeText,job) {
  // Use OpenAI API to analyze the resume text

  const completion = await openAI.chat.completions.create({
      messages: messages = [
        { role: 'system', content: 'You are an HR Professional, skilled in analyzing CVs and Resumes. Use html <p> tags to seperate different aspects and paragraph' },
        { role: 'user', content: `Analyze the resume:\n${resumeText}\n Provide suggestions on how to improve their resume on the criteria Proffesional Summary , Objectives , Work Experience , Education and Specific and Pertinent Skills and at last rate their suitability for a job of ${job} and give a final summary` },
      ],
      model: "gpt-3.5-turbo",
    });
  
    console.log(completion.choices[0].message.content);

  return completion.choices[0].message.content;
}


// Start the server
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});



async function generatePDF(text,token,username) {
    const browser = await puppeteer.launch();
    const outputPath = __dirname + "/reports/" + token + ".pdf" 
    const page = await browser.newPage();

    await page.addStyleTag({
      content: `
        body {
          margin: 20px;
          background-color: orange;
          padding: 20px;
        }
      `,
    });

    // Set content HTML
    const contentHTML = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body {
            margin: 0;
            padding: 0;
            font-family: Arial, sans-serif;
          }
          .header {
            width: 100%;
          }
          .heading {
            font-size: 24px;
            padding: 20px;
          }
          .body-text {
            font-size: 16px;
            padding: 20px;
          }
          .footer {
            width: 100%;
          }

          .content > p {
            font-family: Arial, sans-serif; /* Replace with the font used in ChatGPT */
            font-size: 16px; /* Adjust font size as needed */
            color: #333; /* Dark greyish font color */
            padding: 10px; /* Adjust padding as needed */
            margin: 10px 0; /* Adjust margin as needed */
          }
        </style>
      </head>
      <body>
        <div class="header">
          <img src="data:image/png;base64,${
            readFileSync('./assets/header.png').toString('base64')
          }" style="width: 100%;">
        </div>
        <div class="content">
          <h1 class="heading" style="text-align: center; text-decoration: underline;" >Resume Analysis for ${username}</h1>
          <div class="content" style="padding: 20px;">${text}</div>
        </div>
        <div class="footer">
          <img src="data:image/png;base64,${
            readFileSync('./assets/footer.png').toString('base64')
          }"  style="width: 100%;">
        </div>
      </body>
    </html>
    `;

    await page.setContent(contentHTML);

    // Create PDF
    await page.pdf({ path: outputPath, format: 'A4' });

    await browser.close();
}


//GET Requests
module.exports.handler = serverless(app);



