import puppeteer from "puppeteer";
import axios from "axios"
import ytdl from "@distube/ytdl-core";
import express from 'express'
import cors from "cors"
import OpenAI from "openai"
import { abbrState } from "./stateToAbbreviation.js";
import bodyParser from 'body-parser'



import {GoogleGenerativeAI} from "@google/generative-ai"




const genAI = new GoogleGenerativeAI("AIzaSyAm0Njeg2sVfRNoAtR6GhS2teyzHQ5dL-Y");
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });



const corsOptions = {
  origin: '*',
  methods: '*',
  allowedHeaders: '*'
};

const app = express()
const port = 3000
const breakSearchTermDownForYoutubeUrl = (term) => {
    return `${term.replace(/ /g, "+")}` 
}
app.use(cors(corsOptions));
app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());

const getPageToScrape = async (link) => {
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null,
  });

  const page = await browser.newPage();

  return page
}

const scapeYoutubeLink = async (term,resp=null) => {
    
    let url = breakSearchTermDownForYoutubeUrl(term)


console.log(url)


    
    axios.get(`https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=3&q=${url}&key=AIzaSyCriz5dDPHWXfxT7WGWSgPsnRclSDN2vE4`,
    )
    .then(async (res) => {

      
      try {
        const videoUrl = `https://www.youtube.com/watch?v=${res.data.items[1].id.videoId}`;
        console.log(videoUrl)
        const videoInfo = await ytdl.getInfo(videoUrl);
        const audioFormats = ytdl.filterFormats(videoInfo.formats, "audioonly");
        resp.send(audioFormats[0].url)
       
      } catch (error) {
        console.log(error);
      }
    } )
};

const baseURL = "https://api.aimlapi.com/v1";

// Insert your AIML API Key in the quotation marks instead of my_key:
const apiKey = "60b132feac5c45749347159185c2a072"; 

const api = new OpenAI({
  apiKey,
  baseURL,
});

const ai = async (term,res=null) => {

await model.generateContent(term)
.then(resp => res.send(resp.response.text()))
.catch(err => console.log(err))
};

app.get(`/youtube/:query`, async(req, res) => {
  console.log(req.params.query)
  await scapeYoutubeLink(req.params.query,res)
})
app.get(`/ai/:query`, async(req, res) => {
  console.log(req.params.query)
  await ai(req.params.query,res)
})
app.get(`/weather/:query`, async(req, res) => {
  console.log(req.params.query)
  const gotLocation = getLocation(req.params.query)
  console.log("gotLocation",gotLocation.city,gotLocation.state)
  const city = gotLocation.city
  const state = gotLocation.state
  getLongAndLat(city,state,res)
})



const getLocation = (term) => {
  console.log(term)
  let query = term
  let inIndex = query.indexOf("in") + 3
  let loc = query.substring(inIndex)
  let spaceIndex = loc.indexOf(" ")
  let city = loc.substring(0,spaceIndex)
  let state = loc.substring(spaceIndex+1)
  console.log(state)
  state = abbrState(state,"abbr")
  return {"city":city,"state":state}
}

const getLongAndLat = (city,state,res) => {
  console.log("longandlatfunc",city,state)
  axios.get(`http://api.openweathermap.org/geo/1.0/direct?q=${city},${state},US&limit=1&appid=4392da470b303d7c47b22ec29b551802`).then(resp => {
    getWeather(resp.data[0].lat,resp.data[0].lon,res)
})
  .catch(err => console.log(err))

}
const getWeather = (lat,lon,resp) => {
  console.log("working")
  axios.get(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=imperial&appid=4392da470b303d7c47b22ec29b551802`)
  .then(res => {
    console.log(res.data)
      resp.send(`Today the weather in ${res.data.name} is ${Math.round(res.data.main.temp)}degrees with ${res.data.weather[0].description} but feels like ${Math.round(res.data.main.feels_like)}degrees). `)
      })
  .catch(err => console.log(err))
}
app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})
