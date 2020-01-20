const express = require('express');
const bodyParser = require('body-parser');
const router = express.Router();
const ds = require('./datastore');
const da = require('./day');
const datastore = ds.datastore;
const request = require('request-promise');
const clientId = '318163712449-qa5ron45cjmlls1l8e9kg2na2o06gvf1.apps.googleusercontent.com';


const {OAuth2Client} = require('google-auth-library');
const client = new OAuth2Client(clientId);
router.use(bodyParser.json());

const LIFTS = 'Lifts'
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
function removeLiftDay(liftID,dayID){
	const dayKey = datastore.key(['Days', parseInt(dayID,10)]);
    	const liftKey = datastore.key([LIFTS, parseInt(liftID,10)]);
	const day = get_day(dayID).then((day) => {
		
		liftList = day[0].lifts;
		for(let i = 0; i < liftList.length; i++){
			console.log('run');
			if(liftList[i].self.slice(40) === liftID){
				liftList.splice(i, 1);
			}
		}
		var updateDay = day[0];
		updateDay.lifts = liftList;
		datastore.save({"key":dayKey,"data":updateDay});
	});
	const lift = get_lift(liftID).then((lift) => {
		var updateLift = lift[0];
		updateLift.liftDate = '';
		datastore.save({"key":liftKey,"data":updateLift});

	});

}
function deleteLiftFromDay(liftID,dayID){

	const dayKey = datastore.key(['Days', parseInt(dayID,10)]);
	const day = get_day(dayID).then((day) => {
		
		liftList = day[0].lifts;
		for(let i = 0; i < liftList.length; i++){
			console.log('run');
			if(liftList[i].self.slice(40) === liftID){
				liftList.splice(i, 1);
			}
		}
		var updateDay = day[0];
		updateDay.lifts = liftList;
		datastore.save({"key":dayKey,"data":updateDay});
	});
}
function put_lift_date(liftID, dayID){
	
	 
    	const liftKey = datastore.key([LIFTS, parseInt(liftID,10)]);
    	const dayKey = datastore.key(['Days', parseInt(dayID,10)]);

	const day = get_day(dayID).then((day) => {
	const lift = get_lift(liftID).then((lift) => {
		var updateDay = day[0];
		var updateLift = lift[0];

		updateLift.liftDate = day[0].date;
		updateDay.lifts.push(updateLift);
	 	datastore.save({"key":dayKey,"data":updateDay});	
		
		updateLift.liftDate = day[0].self;
		datastore.save({"key":liftKey,"data":updateLift});	 
	})

	});

}
function patch_self(id, name, sets, reps){
    const key = datastore.key([LIFTS, parseInt(id,10)]);
    const update = {"name": name,"sets": sets, "reps": reps, "self":"http://final-santacrm.appspot.com/lifts/"+id, "liftDate": '',"owner":subID};
    
    datastore.save({"key":key, "data":update});  
    
}
function post_lift(body){
	
	var key = datastore.key(LIFTS);
		
        const new_lift = {"name": body.name, "reps": body.reps, "sets": body.sets};
        return datastore.save({"key":key, "data":new_lift}).then(() => {return key});

}
function get_day(id){
        const l = datastore.key(['Days', parseInt(id,10)]);
        const entity =  datastore.get(l);
        return entity;
}
function get_lift(id){
        const l = datastore.key([LIFTS, parseInt(id,10)]);
        const entity =  datastore.get(l);
        return entity;
}
function get_lifts_owner(owner){
	const q = datastore.createQuery(LIFTS);
	const results = {};
	return datastore.runQuery(q).then( (entities) => {
			 results.items = entities[0].map(ds.fromDatastore).filter( item => item.owner === owner );
			if(entities[1].moreResults !== ds.Datastore.NO_MORE_RESULTS ){
                		results.next = req.protocol + "://" + req.get("host") + req.baseUrl + "?cursor=" + entities[1].endCursor;
            		}
                        	return results;

		});
}
function get_lifts(req){

    var q = datastore.createQuery(LIFTS).limit(5);
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
function delete_lift(id){
    const key = datastore.key([LIFTS, parseInt(id,10)]);
	return datastore.delete(key);
}
function patch_lift(id, body){
	
	const key = datastore.key([LIFTS, parseInt(id,10)]);
    	const update = {"name": body.name, "sets": body.sets, "reps": body.reps, "owner": '', "self":'', "liftDate": ''};

	const lift = get_lift(id)
	.then((lift) => {
    		if(update.name == undefined){
			update.name = lift[0].name; 
    		}
    		if(update.reps == undefined){
			update.reps = lift[0].reps; 
    		}
    		if(update.sets == undefined){
			update.sets = lift[0].sets; 
    		}
		update.owner = lift[0].owner;
		update.self = lift[0].self; 
    		update.liftDate = lift[0].liftDate;
    		datastore.save({"key":key, "data":update}); 
	});
}
function get_lifts_nopage_noowner(){
        const q = datastore.createQuery(LIFTS);
        return datastore.runQuery(q).then( (entities) => {
                        return entities[0].map(ds.fromDatastore);
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
    const liftSize = get_lifts_nopage_noowner()
        .then ( (liftSize) => {
                size = liftSize.length;
            	return size;
        })
        .then( (size) => {
                const lifts = get_lifts(req)
                .then( (lifts) => {
                        lifts.size = size;
                        res.status(200).json(lifts);
        })
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
router.get('/:liftID',function(req, res){
	const lift = get_lift(req.params.liftID)
	.then( (lift) => {
		if(lift[0] == undefined){
			res.status(404).json({Error : "No lift with this lift_id exists"});
		}
        	res.status(200).send(lift[0]);
    });

});
router.post('/', function(req, res){
	var auth = true;		
	if(req.get('content-type') !== 'application/json'){
		res.set("Content", "application/json");
		res.status(415).send({Error: 'Server only accepts application/json data.'});
	}
	if(req.headers.authorization !== undefined){	
		current_id = req.headers.authorization.slice(7);
	}
	else{
		return res.status(401).end();
	}
	verify().then( () => {
		request.get('https://oauth2.googleapis.com/tokeninfo?id_token='+req.headers.authorization.slice(7),)
	 	.then( (response) => {
			response = JSON.parse(response);
	 		subID = response.sub;
	 	});
	 	if(req.body.reps !== undefined && req.body.sets !== undefined  && req.body.name !== undefined){
			post_lift(req.body)
			.then( key => {
				patch_self(key.id,req.body.name, req.body.sets, req.body.reps);
				const lift = get_lift(key.id)
				.then( lift => {
					lift[0].id = key.id;
					res.location(req.protocol + "://" + req.get('host') + req.baseUrl + '/' + key.id);
					res.set("Content", "application/json");
					lift[0].self = req.protocol + "://" + req.get('host') + req.baseUrl + '/' + key.id;
					lift[0].liftDate = '';
					lift[0].owner = subID;
					res.status(201).json(lift[0]); 
				}) 
			});
	 	}
	 	else{
			res.set("Content", "application/json");
			res.status(403).json({Error : "The request object is missing at least one of the required attributes"});
    	 	}
	}).catch(function(){
		return res.status(401).end();
	});
});
router.delete('/:liftID', function(req, res){
		
	if(req.headers.authorization !== undefined){
		current_id = req.headers.authorization.slice(7);
	}
	else{
		return res.status(401).end();
	}
    	verify().then(() => {
	 
	  request.get('https://oauth2.googleapis.com/tokeninfo?id_token='+current_id,)
	  .then( (response) => {
		response = JSON.parse(response);
	 	subID = response.sub;


		const key = datastore.key([LIFTS, parseInt(req.params.liftID,10)]);

		const entity =  datastore.get(key).then( entity => {
 	 	if(entity[0] == undefined){
			res.set("Content", "application/json");

			return res.status(403).json({Error: "No lift with this lift_id exists"});
	 	}
	 	else{
			if(subID !== entity[0].owner){
				return res.status(403).end();
			}
			else{
				if(entity[0].liftDate !== ''){
					deleteLiftFromDay(req.params.liftID,entity[0].liftDate.slice(39));
				}
				delete_lift(req.params.liftID).then(res.status(204).end())
	 		}
		}
		});

	 })
	}).catch(function(){
        	return res.status(401).end();
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

	const lift = get_lift(req.params.id)
		.then( (lift) => {
			if(lift[0] == undefined){
				res.set("Content", "application/json");
				res.status(404).json({Error : "No lift with this lift_id exists"});
				done = true;
				return done;
			}
			ownID = lift[0].owner;
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
						if(done !== true){ 
							patch_lift(req.params.id, req.body);
							return res.status(204).end();
						}
					}
				});
			}).catch(function(){
        			res.status(401).end();
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
	
	if(req.body.name == undefined || req.body.reps == undefined || req.body.sets == undefined){
		return res.status(404).json({Error: 'Missing one of the attributes. Please send a name, reps, and sets.Otherwise use patch.'});
	}
	const lift = get_lift(req.params.id)
		.then( (lift) => {
			if(lift[0] == undefined){
				res.set("Content", "application/json");
				res.status(404).json({Error : "No lift with this lift_id exists"});
				done = true;
				return done;
			}
			ownID = lift[0].owner;
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
						if(done !== true){ 
							patch_lift(req.params.id, req.body);
							return res.status(204).end();
						}
					}
				});
			}).catch(function(){
        			res.status(401).end();
				done = true;
				return done;
    			});
		});

});
router.put('/:liftID/:dayID',function(req, res){
	
	var done = false;
	var ownID = '';
	const lift = get_lift(req.params.liftID)
		.then( (lift) => {
			if(lift[0] == undefined){
				res.set("Content", "application/json");
				res.status(404).json({Error : "No lift with this lift_id exists"});
				done = true;
				return done;
			}
			else if(lift[0].liftDate !== ''){
				res.set("Content", "application/json");
				res.status(403).json({Error : "This lift is already assigned"});
				done = true;
				return done;
			}
			ownID = lift[0].owner;
			
		}).then( () => {
	const day = get_day(req.params.dayID)	
		.then( (day) => {
			if(day[0] == undefined){
				if(done === false){
					res.set("Content", "application/json");
					res.status(404).json({Error : "No day with this day_id exists"});
				}
				done = true;
				return done;
			}
			if(ownID !== day[0].owner){
				if(done === false){
					res.set("Content", "application/json");
					res.status(404).json({Error : "The lift and date are owned by different people"});
				}
				done = true;
				return done;
				
			}
			return done;
		})
				//done is not in scope			//At this point you have proven that both items exist and are owned by the same person	
		.then ( (done) => {
			console.log(done);
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
			console.log("BEFOre Verify");
			verify().then( () => {
	 			request.get('https://oauth2.googleapis.com/tokeninfo?id_token='+current_id,)
	 			.then( (response) => {
					console.log("GOT RESPONESE");
					response = JSON.parse(response);
	 				subID = response.sub;	
					if(subID !== ownID){
						return res.status(403).json({Error : "Owner Associated with given JWT does not own these Items"})
					}
					else{
						console.log("before done check");
						console.log(done);
						if(done == false){ 
							console.log("BEFORE PUT_LIFTPDATE");
							put_lift_date(req.params.liftID, req.params.dayID);
							return res.status(204).send();
						}
					}
				});
			}).catch(function(){
        			res.status(401).end();
				done = true;
				return done;
    			});
		});
		});


});
router.delete('/:liftID/:dayID',function(req, res){
	
	var done = false;
	var ownID = '';

	const lift = get_lift(req.params.liftID)
		.then( (lift) => {
			if(lift[0] == undefined){
				res.set("Content", "application/json");
				res.status(404).json({Error : "No lift with this lift_id exists"});
				done = true;
				return done;
			}
			else if(lift[0].liftDate === ''){
				res.set("Content", "application/json");
				res.status(404).json({Error : "This lift is not assigned"});
				done = true;
				return done;
			}
			ownID = lift[0].owner;
			
		}).then( () => {
	const day = get_day(req.params.dayID)	
		.then( (day) => {
			if(day[0] == undefined){
				if(done === false){
					res.set("Content", "application/json");
					res.status(404).json({Error : "No day with this day_id exists"});
				}
				done = true;
				return done;
			}
			if(ownID !== day[0].owner){
				if(done === false){
					res.set("Content", "application/json");
					res.status(404).json({Error : "The lift and date are owned by different people"});
				}
				done = true;
				return done;
				
			}
		////////////////////////////////////////////////////////////
			liftList = day[0].lifts;
			for(let i = 0; i < liftList.length; i++){
				if(liftList[i].self.slice(40) === req.params.liftID){
					var inside = true;
					break;
				}
			}
			if(inside !== true){
				res.status(404).json({Error:"This lift is not in the lifts list of this day"});
				done = true;
			}
/////////////////////////////////////////
			return done;
		})
				//done is not in scope			//At this point you have proven that both items exist and are owned by the same person	
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
						return res.status(403).json({Error : "Owner Associated with given JWT does not own these Items"})
					}
					else{
						if(done == false){
							removeLiftDay(req.params.liftID, req.params.dayID);
							return res.status(204).send("working");
						}
					}
				});
			}).catch(function(){
        			res.status(401).end();
				done = true;
				return done;
    			});
		});
		});


});

module.exports = router;
