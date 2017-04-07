import resource from 'resource-router-middleware';
import unixTime from 'unix-time';
import fs from 'fs'
import multer from 'multer';
import mimeTypes from 'mime-types';
import pythonShell from 'python-shell';
import path from 'path';
import moment from 'moment';

import Constants from '../constants'
import { dateRegExp, priceRegExp } from '../utils/reg'
import { minImageNameGenerator } from '../utils/utils'

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'static/images/receipts')
  },
  filename: function (req, file, cb) {
    const nowTime = unixTime(new Date());
    const imageExt = mimeTypes.extension(file.mimetype);

    cb(null, `${nowTime}.${imageExt}`)
  }
});

const uploads = multer({storage});


export default ({config, db}) => resource({
  middleware: [
    uploads.single('receiptImg')
  ],

  create({body, file}, res) {
    const receiptImageUrl = `${config.API_HOST_URL}${Constants.RECEIFT_IMAGE_PATH}/${file.filename}`;
    const imagePath = path.resolve(__dirname, `../../${file.path}`);
    const minImageName = minImageNameGenerator(file.path, file.filename);
    const minImagePath = `${config.API_HOST_URL}/${minImageName}`;
    const shellOptions = {args: [imagePath, minImageName]};
    const receiptImageProcessingPromise = new Promise((resolve, reject) => {
      pythonShell.run(Constants.IMAGE_PROCESSING_SCRIPT_PATH, shellOptions, (err, result) => {
        if (err) {
          reject(err);
          return;
        }

        resolve(result);
      });
    });

    receiptImageProcessingPromise
      .then(result => {
        const message = result[0];
        const price = priceRegExp(message);
        let date = dateRegExp(message);
        let weekNumber = null;

        try {
          const momentDate = moment(date);
          weekNumber = momentDate.isoWeek();

          if (Number.isNaN(weekNumber)) {
            weekNumber = null;
          }

          date = momentDate.format("YYYY-MM-DD");

          if (date === "Invalid date") {
            date = null
          }
        } catch (e) {
          date = null;
        }

        const response = {
          date: date,
          price: price,
          weekNumber: weekNumber,
          receiptImageUrl: minImagePath,
        };

        res.json(response);
      })
      .catch(err => {
        console.log(err);
        res.status(500).end();
      })
  }
})
;
