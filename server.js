//works under the condition that player 1 submits
//player 2 submits... then player 1 goes... basically gets final cut
/// want another round of possiblites fo playler 2 before final cut

const express = require('express');
const Datastore = require('nedb');
const request = require('request');
var async = require("async");
const key = 'AIzaSyAVtG_8VMv0PARYhRu2BYY9e92ITWlxsRw';

const app = express();

let port = process.env.PORT || 3000;

app.listen(port, function () {
    console.log('geoLocation app listening on port 3000!')
  });
;
  app.use(express.static('public'));
  app.use(express.json({limit: '1mb'}))

  //start DB
  const database = new Datastore('databse.db');
  database.loadDatabase();

  const databasePlayers = new Datastore('players.db');
  databasePlayers.loadDatabase();

  const databaseRounds = new Datastore('rounds.db');
  databaseRounds.loadDatabase();

  //GET
  app.get('/api', function(request, response){
    database.find({}, (err, data) => {
      if(err){
        response.end();
        return;
      }
      response.json(data);
    })

  });


  ///google code


//extract city.state
  function extractFromAdress(components, type){
    for (var i=0; i<components.length; i++)
        for (var j=0; j<components[i].types.length; j++)
            if (components[i].types[j]==type) return components[i].long_name;
    return "";
}

  let getPromise = function (lat, lon){
      let promise = new Promise(function(resolve, reject){

        let url = `https://maps.googleapis.com/maps/api/geocode/json?radius=50000&latlng=${lat},${lon}&key=${key}`;
         request(url,  function(error, res, body){
         
           if(error){reject(console.log(error))};
            var  jsonObject =   JSON.parse(res.body);

            let city =  extractFromAdress(jsonObject.results[0].address_components, "locality");
            let state =  extractFromAdress(jsonObject.results[0].address_components, "administrative_area_level_1");
                 // var postCode = extractFromAdress(jsonObject.results[0].address_components, "postal_code");
                 //  var street = extractFromAdress(jsonObject.results[0].address_components, "route");
                 //  var country = extractFromAdress(jsonObject.results[0].address_components, "country");
            let cityState = [city, state];
            resolve(cityState);

          })//end request
        });//end promise

  return promise;

  };//end getPromise




  let getNearbyPromise =  function (lat, lon){
    let nearbyPromise = new Promise(function(resolve, reject){
   let keyword = "";
      let url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lon}&radius=1500&type=restaurant&opennow=true&keyword=${keyword}&key=${key}`;
       // console.log(url, "nearby url") 
      request(url,  function(error, res, body){
       
         if(error){reject(console.log(error))};
          var  jsonObject =   JSON.parse(res.body);
             // console.log(jsonObject.results[0].name, "JSON RESULTS")
  
        let names = jsonObject.results.map(x => {
        return x.name
          })

      resolve(names);

        })//end request
      });//end promise

return nearbyPromise;

};//end getPromise


 //POST
  app.post('/api', function (request, response) {
        //console.log(request.body)
  const data = request.body;
  const timestamp = Date.now();
  const lat = data.latitude;
  const lon = data.longitude;
 // const kw = data.keyword;
console.log(request.body, "REQUEST")

  getPromise(lat, lon).then(function(x){

 //put timestamp and location into data
  data.timestamp = timestamp;
  data.location = x;
        
  getNearbyPromise(lat, lon).then(function(x){

    data.restaurants = x;
    insertData(data);

         })//end then1
         .catch(function(err){
           console.log(err)
         })
})
.catch(function(err){
  console.log(err)
})

function insertData (data) {
  database.insert(data);
    //response
         response.json({
             status: 'success',
             location: data.location,
             latitude: data.latitude,
             longitude: data.longitude,
             name: data.name,
             timestamp: timestamp,
             restaurants: data.restaurants

             
           });//end response
}


  });//end post/API

  //use this once ready to post
  app.post('/postRestaurant', function (request, response) {
    console.log('got those resturants!', request.body);
    let selectedRestaurants = request.body;
    let activeRound = databasePlayers.find({},  async function (err,docs){
       let  answer = await docs.round
       return  answer
    })//end ative round

    let restAndRound = {round: activeRound, selected: selectedRestaurants }
     databaseRounds.insert(restAndRound);

  //  console.log(request.body, 'request -- aka data from webpage')
  });
  //

  //addPlayers... want to keep track of players
  app.post('/addPlayers', function (request, res) {
    console.log('players Added!');
   // console.log(request.body, 'Player Request -- aka data from webpage')

  let newPlayers = request.body;
  newPlayersRounds = {round: 1, newPlayers}

  //remvoe all previous players
  databasePlayers.remove({}, { multi: true }, function (err, numRemoved) {
        console.log('all players removed')
  });
  databaseRounds.remove({}, { multi: true }, function (err, numRemoved) {
    console.log('all rounds removed')
});
  //insert active players
  databasePlayers.insert(newPlayersRounds);

});//end addPlayers post

 function playerSelectFunction(playerSelect){
  return  new  Promise( async function(resolve, reject){
let player =  databasePlayers.find({}, await function (err,docs)
{ if (playerSelect == 1) 
  {
  //console.log(docs[0].player1, '<-- player 1');
    selectedPlayer = docs[0].newPlayers.player1
    resolve(selectedPlayer)
  }
    else { 
 // console.log(docs[0].player2, '<-- player 2');
  selectedPlayer = docs[0].newPlayers.player2
  resolve(selectedPlayer)
    }
  }
)
  });

}//end player select


app.get('/round.html/playerDisplay', async function (request, res) {
 //retrieve active players http://localhost:3000/playerDisplay
//find roudn to find player
 let playerSelect = await returnRound().then(async function(x){
   //await console.log(x, 'this shoudl be the player to select')
    if (x == 0){ 
    //  console.log('zero')
      return 1
    }//handle round zero
    else if (x % 2 == 0) {
     // console.log('2')
        return 1;
    } else {
    //  console.log('1')
      return 2;
    }

}).catch(function(err){
  console.log(err)
})


playerSelectFunction(playerSelect).then(function(x){
  res.json({
    success: 'success',
    player: x,
    //round: round
  })
}).catch(function(err){
  console.log(err)
})
  
});//end player display


async function getKW(){
  return  new  Promise( async function(resolve, reject){
  databasePlayers.find({}, async function (err,docs){

  let answer = await docs[0].newPlayers.keyword
  if (answer = null){answer = ""}
   resolve(answer); //items in rounds datastore
  });
})//end prmise
    };//end returnRound

async function returnRound(){
  return  new  Promise( async function(resolve, reject){
  databaseRounds.find({}, async function (err,docs){
  let answer = await docs.length
   resolve(answer); //items in rounds datastore
  });
})//end prmise
    };//end returnRound
  

app.get('/round.html/roundNum', function (request, res) {
 
  returnRound().then(function(x){
    x++ //forward looking round
  
    res.json({
      round: x
    })
  }).catch(function(err){
    console.log(err)
  })
   
 });//end Round Number

 //get the selected restaurants 
 async function getSelected(){
      return  new  Promise( async function(resolve, reject){
        databaseRounds.find({}, async function (err,docs){
        let answer = await docs
      //  console.log(answer, 'answer for roudn 2')
       await resolve(answer); //items in rounds datastore
        });
      })//end prmise
}//end get selected

async function  getOverlapping(z, request){
  //x[0].selected.selected // gets restaurants
  //x[0].selected.player // gets player
  //x[0].selected.round // gets round
async function ar(request){
    let AR = await new Promise((resolve, reject) => {

      resolve(request.activeRound)
    });
    console.log(AR, "AR in AR")
   let answer = await comp(AR)
   return await answer
  }//end AR
  //await console.log(activeRound, 'active round')
 // console.log(x[0].selected.round, 'thiese are the docss tha tmigh toverlap')
 

let OR = ar(request) //.then( comp(activeRound) )//end then
   
 //console.log(activeRound, "AR IN Overlap")


  async function comp(activeRound){


    let playerTwoRestaurants = [];
    let playerOneRestaurants = [];

  let playerTwoNum =    activeRound - 1; //gets index 2 [1] -- on third round
  let playerOneNum =    activeRound - 2; //gets index 1 [0]

  await console.log(z[0].selected.round, '--------------')
console.log(playerOneNum)



///// mayhe have to call them with a promise
for (i = 0; i < z.length; i++) { 
  if (z[i].selected.round == playerTwoNum){
   playerTwoRestaurants = z[i].selected.selected
   console.log(playerTwoRestaurants, 'player 2', activeRound)
  }//end if
}

for (n = 0; n < z.length; n++) { 
  if (z[n].selected.round == playerOneNum){
   playerOneRestaurants = z[n].selected.selected
   console.log(playerOneRestaurants, 'player 1', activeRound)
  }//
}
  
  await console.log('playerTwoNum, playerOneNum', playerTwoNum, playerOneNum)



  //await console.log(z[playerTwoNum].selected.round, 'playerTwoNum comparing round,', playerTwoNum)  
  // await console.log(z[playerOneNum].selected.round, 'playerOneNum comparing round', playerOneNum)  

 //let playerTwoRestaurants =   z[playerTwoNum].selected.selected;
 // let playerOneRestaurants =   z[playerOneNum].selected.selected;

 //await console.log(playerTwoRestaurants, 'playerTwoRestaurants', z[playerTwoNum].selected.player )
 //await console.log(playerOneRestaurants, 'playerOneestaurants', z[playerOneNum].selected.player )

  let overlappingRestaurants = await playerTwoRestaurants.filter(value => playerOneRestaurants.includes(value))
  console.log(overlappingRestaurants, '<--overlapping restuarants');



return await overlappingRestaurants; // goes back to post
  }//end comp

  return OR;



}//END GET OVERLAPPING

///// this is for getting the selected restaurants for round 1 and 2 for example 
// then get the overlapping ones and output that into the DOM
app.post('/round.html/compareRestaurants', function (request, res){
//console.log(request.body, '<--request from round - round + active player')
getSelected().then(async function(x){
 
 let overlap = await getOverlapping(x, request.body);
  res.json({
    status: 'success',
    restaurant: overlap
  })
}).catch(function(err){
  console.log(err)
})



})//end compare Restaurants




 

  app.post('/winner', function(request, res){
 
    returnRound().then(async function(num){
      let aRound =  await num;
      console.log(aRound, "AR in winner")
      getSelected().then(async function(m){
       
        for (i = 0; i < m.length; i++) { 
          if (m[i].selected.round == aRound){
            let winner = m[i].selected.selected
          // console.log(playerTwoRestaurants, 'player 2', activeRound)
    
        
       // let winner = m[aRound].selected.selected;
          await console.log(winner, 'winner! server')
          await res.json({
            answer: winner
          })
                 }//end if  
        }//end for loop
    

    }) }).catch(function(err){
      console.log(err)
    })

  })