import('pdf-parse').then(async (mod) => {
  const fs = await import('fs');
  const files = fs.readdirSync('./uploads/rag/');
  const pdfFile = files.find(f => f.endsWith('.pdf'));
  if (!pdfFile) {
    console.log('No PDF found');
    return;
  }
  console.log('PDF file:', pdfFile);
  const pdfPath = './uploads/rag/' + pdfFile;
  const dataBuffer = fs.readFileSync(pdfPath);
  
  console.log('\n--- Test 1: Default PDFParse ---');
  try {
    const parser = new mod.PDFParse(dataBuffer);
    const result = await parser;
    console.log('Text length:', (result.text || '').length);
    console.log('Result keys:', Object.keys(result));
  } catch (e) {
    console.error('Error:', e.message);
  }
  
  console.log('\n--- Test 2: PDFParse with pagerender ---');
  try {
    const parser = new mod.PDFParse(dataBuffer, {
      pagerender: async function(pageData) {
        const textContent = await pageData.getTextContent();
        console.log('Page text items count:', textContent.items.length);
        if (textContent.items.length > 0) {
          console.log('First item:', JSON.stringify(textContent.items[0]).substring(0, 100));
        }
        return textContent.items.map(item => item.str).join(' ');
      }
    });
    const result = await parser;
    console.log('Text length:', (result.text || '').length);
    console.log('First 200 chars:', (result.text || '').substring(0, 200));
  } catch (e) {
    console.error('Error:', e.message);
    console.error('Stack:', e.stack);
  }
  
  console.log('\n--- Test 3: pdfjs-dist directly ---');
  try {
    const pdfjs = await import('pdfjs-dist');
    console.log('pdfjs-dist imported:', Object.keys(pdfjs).filter(k => !k.startsWith('_')).slice(0, 10));
    
    const pdf = await pdfjs.getDocument({ data: dataBuffer }).promise;
    console.log('PDF loaded, pages:', pdf.numPages);
    
    const page = await pdf.getPage(1);
    const textContent = await page.getTextContent();
    console.log('Page 1 text items:', textContent.items.length);
    
    if (textContent.items.length > 0) {
      console.log('First item:', textContent.items[0]);
      const text = textContent.items.map(item => item.str).join(' ');
      console.log('Text length:', text.length);
      console.log('First 200 chars:', text.substring(0, 200));
    } else {
      console.log('No text items found - this might be an image/scanned PDF');
    }
  } catch (e) {
    console.error('pdfjs error:', e.message);
  }
}).catch(e => console.error('Import:', e.message, e.stack));