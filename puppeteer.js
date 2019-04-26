const puppeteer = require('puppeteer');

const URL = "http://www.geetest.com/type/"

const distanceError = [-10,2,3,5] // 距离误差

let btn_position = null
let times = 0 // 执行重新滑动的次数

let browser,page

const init = async () => {
    if (browser) {
        return;
    }
    browser = await puppeteer.launch({
        "headless": false,
        "args": ["--start-fullscreen"]
    });
    page = await browser.newPage(); 
}

const configPage = async (page) => { 
    await page.setViewport({ width: 1280, height: 1040 });
}

const toRightPage = async (page) => {
    await page.goto(URL)
    await page.evaluate(_ => {
        let rect = document.querySelector(".products-content")         
            .getBoundingClientRect()
        window.scrollTo(0, rect.top - 30)
    })
    await page.waitFor(1000)
    await page.click(".products-content li:nth-child(2)")
    await page.waitFor(1000)
    await page.click("#captcha")
    await page.waitFor(1000)
    btn_position = await getBtnPosition();
    console.log(btn_position, 'btn_position')
  	drag(null)
} 

 /**
  * 计算滑块位置
 */
 async function getBtnPosition() {
  const btn_position = await page.evaluate(() => {
    let rect = document.querySelector('.geetest_slider_button').getBoundingClientRect()
    // return {btn_left:clientWidth/2-104,btn_top:clientHeight/2+59}
    return {btn_left:rect.left+20, btn_top:rect.top+20}
  })
  return btn_position;
 }

 /**
  * 拖动滑块
  * @param distance 滑动距离
  * */ 
 async function drag(distance) {
  distance = distance || await calculateDistance();
  console.log(distance, 'distance')
  const result = await tryValidation(distance.min)
  if(result.isSuccess) {
    await page.waitFor(1000)
    //登录
    console.log('验证成功')
    page.click('.btn-login')
  }else if(result.reDistance) {
    console.log('重新计算滑距离录，重新滑动')
    times = 0
    await drag(null)
  } else {
    if(distanceError[times]){
      times ++
      console.log('重新滑动')
      await drag({min:distance.max,max:distance.max+distanceError[times]})
    } else {
      console.log('滑动失败')
      times = 0
      await init()
	  await configPage(page)
	  await toRightPage(page)
    }
  }
 }

  /**
  * 尝试滑动按钮
  * @param distance 滑动距离
  * */  
 async function tryValidation(distance) {
  //将距离拆分成两段，模拟正常人的行为
  const distance1 = distance - 10
  const distance2 = 10

  page.mouse.click(btn_position.btn_left,btn_position.btn_top,{delay:2000})
  page.mouse.down(btn_position.btn_left,btn_position.btn_top)
  page.mouse.move(btn_position.btn_left+distance1,btn_position.btn_top,{steps:30})
  await page.waitFor(1000)
  page.mouse.move(btn_position.btn_left+distance1+distance2,btn_position.btn_top,{steps:20})
  await page.waitFor(1000)
  page.mouse.up()
  await page.waitFor(1000)
  
  // 判断是否验证成功
  const isSuccess = await page.evaluate(() => {
    return document.querySelector('.geetest_success_radar_tip_content') && document.querySelector('.geetest_success_radar_tip_content').innerHTML
  })
  await page.waitFor(1000)
  // 判断是否需要重新计算距离
  const reDistance = await page.evaluate(() => {
    return document.querySelector('.geetest_result_content') && document.querySelector('.geetest_result_content').innerHTML
  })
  await page.waitFor(1000)
  return {isSuccess:isSuccess==='验证成功',reDistance:reDistance.includes('怪物吃了拼图')}
 }



 /**
  * 计算按钮需要滑动的距离 
  * */ 
 async function calculateDistance() {
  const distance = await page.evaluate(() => {

    // 比较像素,找到缺口的大概位置
    function compare(document) {
      const ctx1 = document.querySelector('.geetest_canvas_fullbg'); // 完成图片
      const ctx2 = document.querySelector('.geetest_canvas_slice');  // 带缺口图片
      const pixelDifference = 30; // 像素差
      let res = []; // 保存像素差较大的x坐标

      // 对比像素
      // 宽高分别是260 160

      //red=imgData.data[0];
	  // green=imgData.data[1];
	  // blue=imgData.data[2];
	  // alpha=imgData.data[3];
      for(let i=10;i<260;i++){
        for(let j=10;j<160;j++) {
          const imgData1 = ctx1.getContext("2d").getImageData(1*i,1*j,1,1)
          const imgData2 = ctx2.getContext("2d").getImageData(1*i,1*j,1,1)
          const data1 = imgData1.data;
          const data2 = imgData2.data;
          const res1=Math.abs(data1[0]-data2[0]);
          const res2=Math.abs(data1[1]-data2[1]);
          const res3=Math.abs(data1[2]-data2[2]);
              if(!(res1 < pixelDifference && res2 < pixelDifference && res3 < pixelDifference)) {
                if(!res.includes(i)) {
                  res.push(i);
                }
              }  
        }
      }
      // 返回像素差最大值跟最小值，经过调试最小值往左小7像素，最大值往左54像素
      return {min:res[0]-7,max:res[res.length-1]-54}
    }
    return compare(document)
  })
  return distance;
 }


~(async () => { 
	await init()
    await configPage(page)
    await toRightPage(page)
})()