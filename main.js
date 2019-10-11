const cheerio = require('cheerio');
const axios = require('axios');
const fs = require('fs');
const mapLimit = require('async/mapLimit');
var request = require("request");
const COMPANIES_FILE = 'companies.json';


// Login to premium account or get the cookie value

async function getCompanies() {
  const companies = [];
  const response = await axios.get('https://leetcode.com/problemset/all/')

  const $ = cheerio.load(response.data);
  $('#current-company-tags > a').each((i, e) => {      
    // console.log(i, e.attribs.href);
    if (!e || !e.attribs || !e.attribs.href) return;
    const tokens = e.attribs.href.split('/');
    if (tokens[tokens.length - 1] === '') tokens.pop();
    companies.push(tokens.pop());
  });
  // console.log(companies);  
  return companies;
}

async function getQuestionsForCompanies(companies, cookie) {
  const companyMap = {}
  return new Promise((resolve, reject) => {
    mapLimit(companies, 3, (company, cb) => {
      // for each company
      console.log(company);
      const options = { 
        method: 'POST',
        url: 'https://leetcode.com/graphql',
        headers: { 
          'cache-control': 'no-cache',
          Referer: 'https://leetcode.com/problemset/all',
          Host: 'leetcode.com',
          Accept: '*/*',
          'cache-control': 'no-cache',
          Connection: 'keep-alive',
          'Cache-Control': 'no-cache',
          Cookie: cookie,
          'Content-Type': 'application/json',
        },
        body: { 
          operationName: 'getCompanyTag',
          variables: { slug: company },
          query: 'query getCompanyTag($slug: String!) {\n  companyTag(slug: $slug) {\n    name\n\n    frequencies\n    questions {\n      ...questionFields\n\n    }\n  }\n\n}\nfragment questionFields on QuestionNode {\n  status\n  questionId\n  questionFrontendId\n  title\n  titleSlug\n  stats\n  difficulty\n  isPaidOnly\n  topicTags {\n    name\n    translatedName\n    slug\n\n  }\n  frequencyTimePeriod\n\n}\n' 
        },
        'content-type': 'application/json',
        json: true, 
      };
  
      request(options, function (error, response, body) {
        if (error) {
          console.log('Error ==> ');
          return cb(error);
        }
        const { data: { companyTag } = {} } = body || {};
        if (!companyTag) return cb();
  
        companyMap[company] = companyTag;      
        cb();
      });
  
    }, (error, results) => {
      if (error) return reject(error);
      // save it to a file once everything is done    
      fs.writeFileSync('companies.json', JSON.stringify(companyMap));
      resolve(companyMap);
    });
  });
}

async function createLists(lists, cookie, csrfToken, isPublic = false) {
  const listMap = {}
  return new Promise((resolve, reject) => {
    mapLimit(lists, 3, (name, cb) => {
      // for each company
      console.log(name);
      const options = { 
        method: 'POST',
        url: 'https://leetcode.com/graphql',
        headers: {
          Referer: 'https://leetcode.com/problems/two-sum/',
          Host: 'leetcode.com',
          Accept: '*/*',
          Connection: 'keep-alive',
          'Cache-Control': 'no-cache',
          // Cookie: cookie,
          Cookie: cookie,
          'Content-Type': 'application/json',
          'x-csrftoken': csrfToken,
          'Content-Type': 'application/json' 
        },
        body: {
          "operationName":"addQuestionToNewFavorite",
          "variables": {
            "questionId":"1",
            "isPublicFavorite": isPublic,
            "name": name          
          },
          "query":"mutation addQuestionToNewFavorite($name: String!, $isPublicFavorite: Boolean!, $questionId: String!) {\n  addQuestionToNewFavorite(name: $name, isPublicFavorite: $isPublicFavorite, questionId: $questionId) {\n    ok\n    error\n    name\n    isPublicFavorite\n    favoriteIdHash\n    questionId\n    __typename\n  }\n}\n"
        },
        json: true,
        'content-type': 'application/json',
      };
  
      request(options, function (error, response, body) {
        if (error) {
          console.log('Error ==> ');
          return cb(error);
        }
        console.log('====>', body);
        // const bodyJSON = JSON.parse(body);
        const { data: { addQuestionToNewFavorite } = {} } = body || {};
        if (!addQuestionToNewFavorite) return cb();
        listMap[name] = addQuestionToNewFavorite.favoriteIdHash;
        cb();
      });
  
    }, (error, results) => {
      if (error) return reject(error);
      resolve(listMap);
    });
  });
}

async function getUserLists(cookie) {
  return new Promise((resolve, reject) => {
    const options = { 
      method: 'GET',
      url: 'https://leetcode.com/list/api/questions',
      headers: {
        Referer: 'https://leetcode.com/lists',
        Host: 'leetcode.com',
        Accept: '*/*',
        Connection: 'keep-alive',
        'Cache-Control': 'no-cache',
        Cookie: cookie,
        'Content-Type': 'application/json' 
      },
      // 'content-type': 'application/json',
    };

    request(options, function (error, response, body) {
      if (error) {
        console.log('Error ==> ');
        return reject(error);
      }
      const bodyJSON = JSON.parse(body);
      const { favorites: { private_favorites } = {} } = bodyJSON || {};

      resolve(private_favorites);
    });
  });
}

async function addQuestionsToList(listId, questions, cookie, csrfToken) {
  return new Promise((resolve, reject) => {
    mapLimit(questions, 3, (questionId, cb) => {      
      const options = { 
        method: 'POST',
        url: 'https://leetcode.com/graphql',
        headers: {
          Referer: 'https://leetcode.com/problems/two-sum/',
          Host: 'leetcode.com',
          Accept: '*/*',
          Connection: 'keep-alive',
          'Cache-Control': 'no-cache',
          Cookie: cookie,
          'Content-Type': 'application/json',
          'x-csrftoken': csrfToken,
          'Content-Type': 'application/json' 
        },
        body: {
          "operationName": "addQuestionToFavorite",
          "variables": {
            "favoriteIdHash": listId,
            "questionId": questionId
          },
          "query":"mutation addQuestionToFavorite($favoriteIdHash: String!, $questionId: String!) {\n  addQuestionToFavorite(favoriteIdHash: $favoriteIdHash, questionId: $questionId) {\n    ok\n    error\n    favoriteIdHash\n    questionId\n    __typename\n  }\n}\n"
        },
        json: true,
        'content-type': 'application/json',
      };
  
      request(options, function (error, response, body) {
        if (error) {
          console.log('Error ==> ');
          return cb(error);
        }
        cb();
      });
  
    }, (error, results) => {
      if (error) return reject(error);
      resolve();
    });
  });
}


async function init(params) {
  if (!params.premiumCookie || !params.normalCookie) return;
  try {
    // premium user cookie 
    const premiumUserCookie = params.premiumCookie;
    // get all companies list from problems page
    const companies = await getCompanies();
    let companyMap = {};

    if (params.skipFetch) {
      const data = fs.readFileSync(COMPANIES_FILE);
      companyMap = JSON.parse(data);
      console.log(Object.keys(companyMap))
    } else {
      // call leetcode graphql api for each company and store them into files
      companyMap = await getQuestionsForCompanies(companies, premiumUserCookie);
    }

    console.log('Companies fetched: ', Object.keys(companyMap).length);

    /* Not a premium member */

    // Login to normal account where you want to create lists
    const normalUserCookie = params.normalCookie;
    const normalUserCSRFToken = params.normalCSRFToken;
    
    // get all user lists (private lists)
    const lists = await getUserLists(normalUserCookie);
    
    let listMap = {};
    lists.forEach(({ name, id_hash }) => {
      listMap[name.toLowerCase()] = id_hash;
    });

    // console.log(listMap);

    // create lists for companies that aren't there
    const listsToCreate = companies.filter(company => !listMap[company]);
    
    // Note: Dummy question is added to all lists
    const newLists = await createLists(listsToCreate, normalUserCookie, normalUserCSRFToken);
    
    listMap = { ...listMap, ...newLists };
    
    // add question to each list based on the company
    let counter = 0;
    mapLimit(companies, 3, (company, cb) => {      
      if (
        !listMap[company] || 
        !companyMap[company] || 
        !companyMap[company].questions
      ) return cb();
      // console.log(company, Object.keys(companyMap[company]));
      const questions = companyMap[company].questions.map(q => q.questionId);
      addQuestionsToList(listMap[company], questions, normalUserCookie, normalUserCSRFToken)
      .then(() => {
        counter++;
        console.log(`${company} list updated`);
        cb();
      })
      .catch(cb);
    }, () => {
      console.log(`${counter} lists updated. Check your leetcode account!!`)
    });


    // TODO: create lists for frequency periods that aren't there

  } catch (ex) {
    console.error(ex);
  }
}

// NOTE: Fill these!
const params = {
  premiumCookie: '',
  normalCookie: '',
  normalCSRFToken: '',
  skipFetch: false,
}

init(params);

// MAY THE FORCE BE WITH YOU!