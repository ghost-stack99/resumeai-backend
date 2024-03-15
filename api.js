// Import necessary modules
const express = require('express');
const multer = require('multer');
const pdfParse = require('pdf-parse');
const { createReadStream } = require('fs');
const OpenAI = require( "openai");
const openai = new OpenAI()
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
// generatePDF("rfrfvf")

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
async function analyzeResume(resumeText,job) {
    // Use OpenAI API to analyze the resume text

    const completion = await openai.chat.completions.create({
        messages: [{ role: "system", content: "You are an Human Resource Professional an HR proffesional analyse the resume,"+resumeText+" give a rating out of 10 for each of the following criteria Relevance to the Job out of 10 , Education out of 10, Work Experience out of 10, Skills out of 10, Achievements and Accomplishments out of 10, Keywords out of 10, Format and Layout out of 10, Relevant Extracurricular Activities or Volunteer Work out of 10, Professionalism out of 10, References out of 10, Customization out of 10, Overall Impression  out of 10 , and explain their areas of improvement and defficiency , "+"likelihood of the resume to be considered for a job as "+job+" on the scale of 100 percent ,"+" and then give an overall score to the resume considering appropriate weightage to the criteria PLEASE GIVE RESPONSE IN HTML inside body markup with proper spacing and line with inline for the arrangement of each criteria inside a div without headings " }],
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
          <div style="padding: 20px;">${text}</div>
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

