const path = require('path');
const bodyParser = require('body-parser');
const express = require('express');
const request = require('request-promise');
const ds = require('./datastore');
const datastore = ds.datastore;
const {OAuth2Client} = require('google-auth-library');

const clientSecret = 'aqj9DXqQDCOfrZqIseZP2PXi';
const clientId = '318163712449-qa5ron45cjmlls1l8e9kg2na2o06gvf1.apps.googleusercontent.com';
const redirectURI = 'http://final-santacrm.appspot.com/credentials';
const grantType = 'authorization_code';


const client = new OAuth2Client(clientId);
const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static('views'));
app.use('/', require('./index'))
app.set('view engine','pug');

var id_token = '';
var subID = 0;
var myToken = 0;
var current_id = '';
const USERS = 'Users';
const DAYS = 'Days';
const LIFTS = 'Lifts';

function get_users(){
	const q = datastore.createQuery(USERS);
	return datastore.runQuery(q).then( (entities) => {
			return entities[0].map(ds.fromDatastore);
		});
}
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
function get_owner_items(owner, type){
	const q = datastore.createQuery(type);
	return datastore.runQuery(q).then( (entities) => {
			return entities[0].map(ds.fromDatastore).filter( item => item.owner === owner );
		});
}
function post_user(first, last, id){
	var key = datastore.key(USERS);
	const new_user = {"firstName": first, "lastName": last, "subID": id};
	datastore.save({"key": key, "data": new_user});
}

app.get('/', (req, res) => {
	res.sendFile(path.join(__dirname, '/views/home.html'));
});
app.get('/users',(req,res) =>{
	const users = get_users()
	.then ( (users) => {
		res.set('Content','application/json');
		res.status(200).json(users);
	});


});
app.get('/credentials', (req, res) => {
  
  let userCode = req.query.code;

  request.post('https://oauth2.googleapis.com/token', {
	  form: {
		code:userCode,
		client_id:clientId,
		client_secret:clientSecret,
		redirect_uri:redirectURI,
		grant_type:grantType
	  }
  }).then((response) => {
	 response = JSON.parse(response);
	 id_token = response.id_token;
	 let tType = response.token_type;
	 let accessToken = response.access_token;
	
	 request.get('https://oauth2.googleapis.com/tokeninfo?id_token='+id_token,)
	 .then( (response) => { 
		response = JSON.parse(response);
	 	subID = response.sub; 
	});

	 request.get('https://people.googleapis.com/v1/people/me?personFields=names,emailAddresses', {
		headers: {
			'Authorization': tType + ' ' + accessToken
		}
  	 }).then( (response) => { 
		response = JSON.parse(response);
	 	firstNamme = response.names[0].givenName;
		const lastName = response.names[0].familyName; 
		res.redirect('/oauth?firstName='+firstNamme+'&lastName='+lastName);
	});
     });
	
});
app.get('/oauth', (req, res) => {
	var noPost = false;
	const users = get_users()
	.then ( (users) => {
		
		for(let i = 0; i < users.length; i++){
			if(users[i].subID == subID){
				noPost = true;	
			}
		}
		if(noPost == false){
			post_user(req.query.firstName, req.query.lastName, subID);
		}
	});
	res.render('login',{firstName: req.query.firstName, lastName: req.query.lastName, jwt: id_token, ownerID: subID})
//	res.send('First Name: ' + firstNamme + '<br> Last Name: ' + req.query.lastName + '<br> JWT: '+ id_token+'<br> Owner: '+ subID 
//	+ '<br> <div><button onclick="location.href=\'/\'" type="button">Sign in</button></div>'); 

});
app.get('/users/:user_id', function(req, res){
        
	if(req.headers.authorization !== undefined){ 
                current_id = req.headers.authorization.slice(7);
        }
        else{
                return res.status(401).end();
        }



    verify().then( () => {
        
	  request.get('https://oauth2.googleapis.com/tokeninfo?id_token='+current_id,)
         .then( (response) => {
                response = JSON.parse(response);
                subID = response.sub;
                if(subID !== req.params.user_id){
                        return res.status(401).end();
                }
                else{
                        const items = get_owner_items(req.params.user_id, DAYS)
                        .then( (items) => {
				const moreItems = get_owner_items(req.params.user_id, LIFTS)
				.then ((moreItems)=> {
					var newList = items.concat(moreItems);
                                	res.set('Content','application/json');
                                	res.status(200).json(newList);
				})
                        });
                }



         });
	}).catch(function(){
        	return res.status(401).end();
    	});



});

const PORT = process.env.PORT || 8020;
app.listen(PORT, () => {
	console.log('Server listening on port ${PORT}...');
});

module.exports = app;
