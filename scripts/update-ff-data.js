import axios from 'axios';
import unzipper from 'unzipper';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Papa from 'papaparse';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_URL = 'https://mba.tuck.dartmouth.edu/pages/faculty/ken.french/ftp/F-F_Research_Data_5_Factors_2x3_daily_CSV.zip';
const OUTPUT_FILE = path.resolve(__dirname, '../src/data/ff5_daily.json');

async function downloadAndParseFF5() {
  console.log('Downloading Fama-French 5-Factor Daily Data...');
  try {
    const response = await axios({
      method: 'get',
      url: DATA_URL,
      responseType: 'arraybuffer',
    });

    console.log('Extracting ZIP...');
    const directory = await unzipper.Open.buffer(response.data);
    const file = directory.files.find(d => d.path.toUpperCase().endsWith('.CSV'));

    if (!file) {
      throw new Error('No CSV file found in the ZIP archive.');
    }

    console.log(`Found CSV file: ${file.path}`);
    const csvData = await file.buffer().then(b => b.toString('utf8'));

    console.log('Parsing CSV...');
    const lines = csvData.split('\n').map(l => l.trim().replace('\r', ''));
    let dataStartIdx = 0;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].startsWith('Unnamed: 0') || lines[i].includes('Mkt-RF')) {
        dataStartIdx = i;
        break;
      }
    }

    let dataEndIdx = lines.length;
    for (let i = dataStartIdx + 1; i < lines.length; i++) {
      if (lines[i].trim() === '' || lines[i].includes('Copyright')) {
        dataEndIdx = i;
        break;
      }
    }

    const cleanCsvLines = lines.slice(dataStartIdx, dataEndIdx);
    
    if (cleanCsvLines[0].startsWith('Unnamed: 0')) {
      cleanCsvLines[0] = cleanCsvLines[0].replace('Unnamed: 0', 'Date');
    } else if (cleanCsvLines[0].startsWith(',')) {
      cleanCsvLines[0] = 'Date' + cleanCsvLines[0];
    }

    const parsed = Papa.parse(cleanCsvLines.join('\n'), {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: true,
    });

    if (parsed.errors.length) {
      console.warn('PapaParse warnings:', parsed.errors);
    }

    const result = parsed.data.map(row => {
      const dateStr = String(row['Date']);
      if (dateStr.length !== 8) return null;
      
      const year = dateStr.substring(0, 4);
      const month = dateStr.substring(4, 6);
      const day = dateStr.substring(6, 8);

      return {
        date: `${year}-${month}-${day}`,
        'Mkt-RF': parseFloat(row['Mkt-RF']) / 100,
        SMB: parseFloat(row['SMB']) / 100,
        HML: parseFloat(row['HML']) / 100,
        RMW: parseFloat(row['RMW']) / 100,
        CMA: parseFloat(row['CMA']) / 100,
        RF: parseFloat(row['RF']) / 100,
      };
    }).filter(row => row !== null);

    const fiveYearsAgoDate = new Date();
    fiveYearsAgoDate.setFullYear(fiveYearsAgoDate.getFullYear() - 5);
    const fiveYearsAgoStr = fiveYearsAgoDate.toISOString().split('T')[0];
    
    const recentData = result.filter(r => r.date >= fiveYearsAgoStr);

    console.log(`Writing ${recentData.length} daily records to ${OUTPUT_FILE}`);
    
    fs.mkdirSync(path.dirname(OUTPUT_FILE), { recursive: true });
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(recentData, null, 2));
    console.log('Done!');
  } catch (error) {
    console.error('Failed to download or parse data:', error);
  }
}

downloadAndParseFF5();