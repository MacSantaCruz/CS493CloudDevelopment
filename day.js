const express = require('express');
const bodyParser = require('body-parser');
const router = express.Router();
const ds = require('./datastore');
const datastore = ds.datastore;
const request = require('request-promise');
const clientId = '318163712449-qa5ron45cjmlls1l8e9kg2na2o06gvf1.apps.googleusercontent.com';


const {OAuth2Client} = require('google-auth-library');
const client = new OAuth2Client(clientId);
router.use(bodyParser.json());

const DAYS = 'Days'
var subID = '';
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

async function verify() {
  const ticket = await client.verifyIdToken({
      idToken: current_id,
      audience: clientId,  // Specify the CLIENT_ID of the app that accesses the backend
      // Or, if multiple clients access the backend:
      //[CLIENT_ID_1, CLIENT_ID_2, CLIENT_ID_3]
  });
  const payload = ticket.getPayload();
  const userid = payload['sub'];
}

function patch_self(id, date, program, weekNumber){
    const key = datastore.key([DAYS, parseInt(id,10)]);
    const update = {"date": date,"program": program, "weekNumber": weekNumber, "self":"http://final-santacrm.appspot.com/days/"+id, "lifts": [],"owner":subID};
    
    datastore.save({"key":key, "data":update});  
    
}
function get_lift(id){
        const l = datastore.key(['Lifts', parseInt(id,10)]);
        const entity =  datastore.get(l);
        return entity;
}
function deleteDayFromLift(dayID, liftList){

	console.log(liftList);	
	for(let i = 0; i < liftList.length; i++){
                var liftID = liftList[0].self.slice(40); //liftID
                var lift = get_lift(liftID).then((lift) => {
			lift[0].liftDate = '';
			var liftKey = datastore.key(['Lifts', parseInt(liftID,10)]);
			datastore.save({"key":liftKey, "data":lift[0]});
			});
            
                }
}
function post_days(body){
	
	var key = datastore.key(DAYS);
		
        const new_day = {"Date": body.date, "program": body.program, "weekNumber": body.weekNumber, "self": 'http://final-santacrm.appspot.com/'+key};
        return datastore.save({"key":key, "data":new_day}).then(() => {return key});

}
function get_day(id){
        const l = datastore.key([DAYS, parseInt(id,10)]);
        
        const entity =  datastore.get(l);
        return entity;
}
function get_days_nopage_noowner(){
	const q = datastore.createQuery(DAYS);
	return datastore.runQuery(q).then( (entities) => {
			return entities[0].map(ds.fromDatastore);
		});
}
function get_days_nopage(){
	const q = datastore.createQuery(DAYS);
	return datastore.runQuery(q).then( (entities) => {
			return entities[0].map(ds.fromDatastore).filter(item => item.owner == subID);
		});
}
function get_days_owner(owner){
	const q = datastore.createQuery(DAYS);
	const results = {};
	return datastore.runQuery(q).then( (entities) => {
			 results.items = entities[0].map(ds.fromDatastore).filter( item => item.owner === owner );
			if(entities[1].moreResults !== ds.Datastore.NO_MORE_RESULTS ){
                		results.next = req.protocol + "://" + req.get("host") + req.baseUrl + "?cursor=" + entities[1].endCursor;
            		}
                        	return results;

		});
}
function get_days(req){

    var q = datastore.createQuery(DAYS).limit(5);
    const results = {};
    if(Object.keys(req.query).includes("cursor")){
        q = q.start(req.query.cursor);
    }
	return datastore.runQuery(q).then( (entities) => {
            results.items = entities[0].map(ds.fromDatastore);
            if(entities[1].moreResults !== ds.Datastore.NO_MORE_RESULTS ){
                results.next = req.protocol + "://" + req.get("host") + req.baseUrl + "?cursor=" + entities[1].endCursor;
            }
			return results;
		});

}
function delete_day(id){
    const key = datastore.key([DAYS, parseInt(id,10)]);
	return datastore.delete(key);
}
function patch_day(id, body){
	
	const key = datastore.key([DAYS, parseInt(id,10)]);
    	const update = {"date": body.date, "program": body.program, "weekNumber": body.weekNumber, "owner": '', "self":'', "lifts": []};

	const day = get_day(id)
	.then((day) => {
    		if(update.date == undefined){
			update.date = day[0].date; 
    		}
    		if(update.program == undefined){
			update.program = day[0].program; 
    		}
    		if(update.weekNumber == undefined){
			update.weekNumber = day[0].weekNumber; 
    		}
		update.owner = day[0].owner;
		update.self = day[0].self; 
    		update.lifts = day[0].lifts;
    		datastore.save({"key":key, "data":update}); 
	});
}
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
router.get('/', function(req, res){
    var size = 0;
    const accepts = req.accepts(['application/json']);
    if (!accepts){
	return res.status(406).json({Error: "server cannot send back that mime type"});
    }
    const daySize = get_days_nopage_noowner()
	.then ( (daySize) => {
	        size = daySize.length;
		//console.log(size);
		return size;
	})
	.then( (size) => { 
    		const days = get_days(req)
		.then( (days) => {
			days.size = size; 
        		res.status(200).json(days);
    	})
	});
    
});
router.get('/:dayID',function(req, res){
	const day = get_day(req.params.dayID)
	.then( (day) => {
		if(day[0] == undefined){
			res.status(404).json({Error : "No day with this day_id exists"});
		}
        	res.status(200).send(day[0]);
    });

});
router.delete('/', function(req, res){
	res.set('Accept', 'GET, POST');

	res.status(405).end();
});
router.put('/', function(req, res){
	res.set('Accept', 'GET, POST');

	res.status(405).end();
});
router.post('/', function(req, res){
	var auth = true;		
	if(req.headers.authorization !== undefined){	
		current_id = req.headers.authorization.slice(7);
	}
	else{
		return res.status(401).end();
	}
	verify().then(() => { 
	 request.get('https://oauth2.googleapis.com/tokeninfo?id_token='+req.headers.authorization.slice(7),)
	 .then( (response) => {
		response = JSON.parse(response);
	 	subID = response.sub;
	 });
	
	var checkDate = false;
	if(req.get('content-type') !== 'application/json'){
		res.set("Content", "application/json");
		res.status(415).send({Error: 'Server only accepts application/json data.'});
	}
	if(req.body.date !== undefined && req.body.program !== undefined  && req.body.weekNumber !== undefined){
		/*
		const result = errorCheck(req.body);
		if(result === false){
			res.set("Content", "application/json");
			return	res.status(403).json({Error: 'One or more the inputs has incorrect format or extra attribute'}).end();
		}
		*/	
		const days = get_days_nopage()
		.then( (days) => {
			if(auth == false){
				return res.status(401).end();
			}

			for(let i = 0; i < days.length; i++){
				if(days[i].date == req.body.date){
					res.set("Content", "application/json");
					return res.status(403).json({Error:'Date already Exists'}).end();//doesn't return properly maybe look into
					checkDate = true;
				}
			}

			if(checkDate !== true){
				post_days(req.body,req.body.date,req.body.program,req.body.weekNumber)
			
				.then( key => {
					patch_self(key.id,req.body.date, req.body.program, req.body.weekNumber);
					const day = get_day(key.id)
					.then( day => {
						day[0].id = key.id;
						res.location(req.protocol + "://" + req.get('host') + req.baseUrl + '/' + key.id);
						res.set("Content", "application/json");
						res.status(201).json(day[0]); 
					}) 
				})
			}
		});
	}
	else{
		res.set("Content", "application/json");
		res.status(403).json({Error : "The request object is missing at least one of the required attributes"});
    	}
	})		
	.catch(function(){
		auth = false;
    		return res.status(401).end();
	});
});
router.delete('/:dayID', function(req, res){
	
	if(req.headers.authorization !== undefined){
		current_id = req.headers.authorization.slice(7);
	}
	else{
		return res.status(401).end();
	}
    	verify().catch(function(){
        	return res.status(401).end();
    	});

	 request.get('https://oauth2.googleapis.com/tokeninfo?id_token='+current_id,)
	 .then( (response) => {
		response = JSON.parse(response);
	 	subID = response.sub;


		const key = datastore.key([DAYS, parseInt(req.params.dayID,10)]);

		const entity =  datastore.get(key).then( entity => {
 	 	if(entity[0] == undefined){
			res.set("Content", "application/json");

			res.status(403).json({Error: "No date with this date_id exists"});
	 	}
	 	else{
			if(subID !== entity[0].owner){
				return res.status(403).json({Error: "owner Associated with given JWT does not own this date entry"});
			}
			else{
				/*if(entity[0].lifts.length > 0){
					console.log(entity[0].lifts);
					deleteDayFromLift(req.params.dayID,entity[0].lifts);
				}*/
				//setTimeout(function () {
					delete_day(req.params.dayID).then(res.status(204).end());
				//},4000);
	 		}
		}
		});

	 });

});
router.patch('/:id', function(req,res){
	var done = false;
	var ownID = '';
	if(req.get('content-type') !== 'application/json'){
		console.log("Before error 415");
		res.set("Content", "application/json");
		return res.status(415).send({Error: 'Server only accepts application/json data.'});
	}

	const day = get_day(req.params.id)
		.then( (day) => {
			if(day[0] == undefined){
				console.log("Before no date 404");
				res.set("Content", "application/json");
				
				res.status(404).json({Error : "No date with this date_id exists"});
				done = true;
				return done;
			}
			ownID = day[0].owner;
		})
		.then ( (done) => {
			if(done === true){
				return done;
			}
			if(req.headers.authorization !== undefined){ 
                		current_id = req.headers.authorization.slice(7);
        		}
        		else{
                		res.status(401).end();
				done = true;
				return done;
        		}
			verify().then( () => {
	 			request.get('https://oauth2.googleapis.com/tokeninfo?id_token='+current_id,)
	 			.then( (response) => {
					response = JSON.parse(response);
	 				subID = response.sub;		
					if(subID !== ownID){
						res.status(403).json({Error : "Owner Associated with given JWT does not own this date entry"})
					}
					else{
						if(req.body.date !== undefined){

							const dayList = get_days_nopage()
							.then( (dayList) => {
								for(let i = 0; i < dayList.length; i++){
									if(dayList[i].date == req.body.date && dayList[i].id != req.params.id){
										res.status(403).json({Error: 'Date already exists. Cannot change.'});
										done = true;
									}
								}
								if(done !== true){//Made it through all checks and renaming the date 
									patch_day(req.params.id, req.body);
									return res.status(204).end();
								}
							});
						}
						else{
							if(done !== true){//Made it through all the checks and not renaming the date 
									patch_day(req.params.id, req.body);
									return res.status(204).end();
							}
						}
					}
				});
			}).catch(function(){
        			res.status(401).end();
				console.log("In verify failure");
				done = true;
				return done;
    			});
		});
});
router.put('/:id', function(req,res){
	var done = false;
	var ownID = '';
	if(req.get('content-type') !== 'application/json'){
		console.log("Before error 415");
		res.set("Content", "application/json");
		return res.status(415).send({Error: 'Server only accepts application/json data.'});
	}
	
	if(req.body.date == undefined || req.body.program == undefined || req.body.weekNumber == undefined){
		return res.status(404).json({Error: 'Missing one of the attributes. Please send a date, program, and weekNumber.Otherwise use patch.'});
	}
	const day = get_day(req.params.id)
		.then( (day) => {
			if(day[0] == undefined){
				console.log("Before no date 404");
				res.set("Content", "application/json");
				
				res.status(404).json({Error : "No date with this date_id exists"});
				done = true;
				return done;
			}
			ownID = day[0].owner;
		})
		.then ( (done) => {
			if(done === true){
				return done;
			}
			if(req.headers.authorization !== undefined){ 
                		current_id = req.headers.authorization.slice(7);
        		}
        		else{
                		res.status(401).end();
				done = true;
				return done;
        		}
			verify().then( () => {
	 			request.get('https://oauth2.googleapis.com/tokeninfo?id_token='+current_id,)
	 			.then( (response) => {
					response = JSON.parse(response);
	 				subID = response.sub;		
					if(subID !== ownID){
						res.status(403).json({Error : "Owner Associated with given JWT does not own this date entry"})
					}
					else{
							const dayList = get_days_nopage()
							.then( (dayList) => {
								for(let i = 0; i < dayList.length; i++){
									if(dayList[i].date == req.body.date && dayList[i].id != req.params.id){
										res.status(403).json({Error: 'Date already exists. Cannot change.'});
										done = true;
									}
								}
								if(done !== true){//Made it through all checks. Maybe add specific put_day but it works.  
									patch_day(req.params.id, req.body);
									return res.status(204).end();
								}
							});
					}
				});
			}).catch(function(){
        			res.status(401).end();
				console.log("In verify failure");
				done = true;
				return done;
    			});
		});

});
module.exports = router;
