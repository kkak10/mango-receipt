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
    const receiptImageUrl = `http://172.30.25.194:8080${Constants.RECEIFT_IMAGE_PATH}/${file.filename}`;
    const scriptPath = 'static/scripts/imageProcessing.py';
    const imagePath = path.resolve(__dirname, `../../${file.path}`);
    const shellOptions = {args: [imagePath]};

    pythonShell.run(scriptPath, shellOptions, (err, result) => {
      if (err) {
        console.log(err);
        return;
      }

      const message = result[0];
      const price = priceRegExp(message);
      let date = dateRegExp(message);
      let weekNumber;

      if (date) {
        const momentDate = moment(date);
        weekNumber = momentDate.isoWeek();
        date = momentDate.format('YYYY-MM-DD');
      }

      res.json({
        date,
        price,
        weekNumber,
        receiptImageUrl,
      });
    });
  }
});
