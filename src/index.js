import axios from 'axios';
import cheerio from 'cheerio';
import fs from 'fs';

const columns = ['title', 'thumbnail', 'price', 'original_price', 'images', 'detail'];
const baseUrl = 'https://store.baemin.com';
const wholeItem = `${baseUrl}/goods/goods_list.php?cateCd=001&page=`;

const SEPARATOR = '\t';

function jsonToCSV(jsonData) {
  let csvString = '';

  columns.forEach((column, index) => {
    if (index === columns.length - 1) csvString += `${column}\r\n`;
    else csvString += `${column}${SEPARATOR}`;
  });

  jsonData.forEach((content, index) => {
    let row = '';
    for (let title of columns) {
      if (row === '') row += `${content[title]}`;
      else row += `${SEPARATOR}${content[title]}`;
    }
    csvString += index !== jsonData.length - 1 ? `${row}\r\n` : `${row}`;
  });

  return csvString;
}

function getItemUrl(html) {
  const result = [];
  const $ = cheerio.load(html.data);
  $('body')
    .find('.item_photo_box>a')
    .each(function () {
      result.push($(this).attr('href').substr(2));
    });
  return result;
}

function getItemInfo($, $content) {
  let item = {};
  // 썸네일
  item.thumbnail = `${baseUrl}${$content.find('#mainImage>img').attr('src')}`;
  // 제목
  item.title = $content.find('.item_detail_tit>h3').text();
  // 가격
  item.price = +$content.find('.item_price>dd>strong>strong').text().replace(/,/g, '');
  // 정가
  const original_price = +$content.find('.item_detail_list>dl>dd>del>span').text().replace(/,/g, '');
  if (original_price !== 0) item.original_price = original_price;
  // 상세 이미지
  const images = [];
  $content.find('.txt-manual img').each(function () {
    images.push(`${baseUrl}${this.attribs.src}`);
  });
  item.images = JSON.stringify(images);
  // 상세 정보
  const detail = {};
  $content.find('.detail_info_box .left_table_type>tbody tr').each(function () {
    const name = $(this).find('th').text();
    const desc = $(this).find('td').text();
    detail[name] = desc;
  });
  item.detail = JSON.stringify(detail);

  return item;
}

async function getItemInfoForPage(itemUrls) {
  const result = [];

  for (const url of itemUrls) {
    const itemUrl = `${baseUrl}${url}`;
    const html = await axios.get(itemUrl);
    const $ = cheerio.load(html.data);
    const $content = $('.sub_content');

    const item = getItemInfo($, $content);
    result.push(item);
  }

  return result;
}

const result = [];
for (let i = 1; i < 13; i++) {
  const html = await axios.get(`${wholeItem}${i}`);
  const itemUrls = getItemUrl(html);
  const res = await getItemInfoForPage(itemUrls);
  result.push(...res);
}

const csvString = jsonToCSV(result);
fs.writeFileSync('item_data.csv', '\uFEFF' + csvString);
