const express = require('express');
const bodyParser = require('body-parser');
const { createWorker } = require('tesseract.js');
const fs = require('fs');
const path = require('path');
const app = express();
const port = 3000;
const config = require('./config.js');
const screenshot = require('screenshot-desktop');

app.use(bodyParser.json());
app.use("/control-images", express.static(path.resolve(`${process.cwd()}${path.sep}control-images`)));

async function takeScreenshot() {
    const screenshotFolder = './control-images';
    
    if (!fs.existsSync(screenshotFolder)) {
        fs.mkdirSync(screenshotFolder);
    }
    
    const screenshotFilename = 'screenshot-' + Date.now();
    
    await screenshot({ format: 'png', filename: `${screenshotFolder}/${screenshotFilename}.png` });
    
    return screenshotFilename;
}

async function checkKeywordsInText(text) {
    let keywords = config.keywords;

    let foundKeywords = keywords.filter(keyword => text.toLowerCase().includes(keyword.toLowerCase()));

    if (foundKeywords.length > 0) {
        console.log(`Ekranda Aranan Kelimelerden Birisi Veya Birden Fazlası Bulundu: ${foundKeywords.join(', ')} | ${new Date().toLocaleString()}`);
        return true;
    } else {
        return false;
    }
}


async function performOCRAndCheckKeywords() {
    try {
        const pathImage = await takeScreenshot();
        const imagePath = `./control-images/${pathImage}.png`;

        const worker = await createWorker('eng');
        console.log(`OCR İşlemi Başlatıldı: ${pathImage}.png | ${new Date().toLocaleString()}`);
        const ret = await worker.recognize(`http://localhost:3000/control-images/${pathImage}.png`);

        const isKeywordFound = await checkKeywordsInText(ret.data.text);

        if (!isKeywordFound) {
            fs.unlinkSync(imagePath);
        } else {
            const successImagesFolder = './success-images';
            if (!fs.existsSync(successImagesFolder)) {
                fs.mkdirSync(successImagesFolder);
            }
            const successImagePath = `./success-images/${pathImage}.png`;
            fs.renameSync(imagePath, successImagePath);
        }
        await worker.terminate();
    } catch (error) {}
}

setInterval(async() => {
    performOCRAndCheckKeywords();
}, config.delay);

app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});
