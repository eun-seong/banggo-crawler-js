import axios from 'axios';
import cheerio from 'cheerio';
import fs from 'fs';

// 옵션
const baseUrl = 'https://store.baemin.com';
const wholeItem = `${baseUrl}/goods/goods_list.php?cateCd=001&page=`;

function getItemUrl(html) {
  const result = [];
  const $ = cheerio.load(html.data);
  $('body')
    .find('.item_photo_box>a')
    .each(function (index, ele) {
      result.push($(this).attr('href').substr(2));
    });
  return result;
}

function getItemInfo($, $content) {
  let item = {
    images: [],
    detail: {},
  };
  item.thumbnailUrl = `${baseUrl}${$content.find('#mainImage>img').attr('src')}`;
  item.title = $content.find('.item_detail_tit>h3').text();
  item.price = +$content.find('.item_price>dd>strong>strong').text().replace(/,/g, '');
  const original_price = +$content.find('.item_detail_list>d1> del>span').text().replace(/,/g, '');
  if (original_price !== 0) item.original_price = original_price;
  $content.find('.js-smart-img').each(function () {
    item.images.push(this.attribs.src);
  });
  $content.find('.detail_info_box .left_table_type>tbody tr').each(function () {
    const name = $(this).find('th').text();
    const desc = $(this).find('td').text();
    item.detail[name] = desc;
  });
}

async function getItemInfoForPage(itemUrls) {
  const result = [];

  for (const url of itemUrls) {
    const itemUrl = `${baseUrl}${url}`;
    const rawHtml = await axios.get(itemUrl);
    const html = rawHtml.replace(
      `chosen-container chosen-container-single chosen-container-single-nosearch`,
      `chosen-container chosen-container-single chosen-container-single-nosearch chosen-container-active chosen-with-drop`
    );

    const $ = cheerio.load(html.data);
    const $content = $('.sub_content');

    const item = getItemInfo($, $content);
    result.push(item);
  }

  return result;
}

const result = [];
for (let i = 1; i < 13; i++) {
  const html = await axios.get(wholeItem);
  const itemUrls = getItemUrl(html);
  const res = await getItemInfoForPage(itemUrls);
  result.push(...res);
}

console.log(result);
