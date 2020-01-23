/*
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict';
'use esversion: 6';

const { FileSystemWallet, Gateway } = require('fabric-network');
const path = require('path');

const ccpPath = path.resolve(__dirname, '..', '..', 'first-network', 'connection-org1.json');

function makeid(length) {
    let result = '';
    let characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let charactersLength = characters.length;
    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
}

function concat() {
    let ret = '';
    for (let i = 0; i < arguments.length; i++) {
        ret += ' ' + arguments[i];
    }
    return ret;
}

async function main() {
    try {

        // Create a new file system based wallet for managing identities.
        const walletPath = path.join(process.cwd(), 'wallet');
        const wallet = new FileSystemWallet(walletPath);
        console.log(`Wallet path: ${walletPath}`);

        // Check to see if we've already enrolled the user.
        const userExists = await wallet.exists('user1');
        if (!userExists) {
            console.log('An identity for the user "user1" does not exist in the wallet');
            console.log('Run the registerUserHandler.js application before retrying');
            return;
        }

        // Create a new gateway for connecting to our peer node.
        const gateway = new Gateway();
        await gateway.connect(ccpPath, { wallet, identity: 'user1', discovery: { enabled: true, asLocalhost: true } });

        // Get the network (channel) our contract is deployed to.
        const network = await gateway.getNetwork('mychannel');

        // Get the contract from the network.
        const contract = network.getContract('fabcar');

        //////////////////////////////////////////////////
        //////////////////////////////////// putting a boundary to keep new code seperate from old code
        let express = require('express');
        let app = express();
        let bodyParser = require('body-parser');
        const PORT = process.env.PORT || 3000;

        // Create application/x-www-form-urlencoded parser

        // parse application/x-www-form-urlencoded
        app.use(bodyParser.urlencoded({ extended: false }));

        // parse application/json
        app.use(bodyParser.json());


        app.use(express.static('files')); //we'll put the files in the "files" folder

        app.get('/getRandom', async (req, res) => {
            let randomData = {};
            let seed = Date.now().toString();
            let result = await contract.evaluateTransaction('getRandom', seed);
            result = JSON.parse(result);
            randomData.data = result;
            res.setHeader('content-type', 'text/json');
            res.send(randomData);
        });

        app.post('/getRandom', async (req, res) => {
            let seed = req.body.seed.toString();
            let result = await contract.evaluateTransaction('getRandom', seed);
            // result = JSON.parse(result);
            res.setHeader('content-type', 'text/json');
            res.send(result);
        });

        app.get('/generateUID', async (req, res) => {
            let result = await contract.evaluateTransaction('generateUID');
            // result = JSON.parse(result);
            res.setHeader('content-type', 'text/json');
            res.send(result);
        });

        app.post('/generateUID', async (req, res) => {
            let result = await contract.evaluateTransaction('generateUID');
            // result = JSON.parse(result);
            res.setHeader('content-type', 'text/json');
            res.send(result);
        });

        app.post('/createElection', async (req, res) => {
            let electionName = req.body.electionName.toString();
            let electionDuration = req.body.electionDuration.toString();

            // console.log(electionName, electionDuration);
            // res.setHeader('content-type', 'text/json');

            let promise = contract.submitTransaction('createElection', electionName, electionDuration);
            promise.then((data) => {
                console.log(data);

                let msg = {
                    status: 'success',
                    message: 'Election Created'
                };

                res.setHeader('content-type', 'text/json');
                res.send(msg);
            }).catch((err) => {
                console.log(err);

                let msg = {
                    status: 'failure',
                    message: err.toString()
                };

                res.setHeader('content-type', 'text/json');
                res.send(msg);
            });


        });

        let getElectionsHandler = async (req, res) => {
            let result = await contract.evaluateTransaction('getElections');
            // result = JSON.parse(result);
            res.setHeader('content-type', 'text/json');
            res.send(result.toString());
        };
        app.get('/getElections', getElectionsHandler);
        app.post('/getElections', getElectionsHandler);

        let addCandidateHandler = async (req, res) => {
            let name = req.body.name.toString(),
                sign = req.body.sign.toString(),
                imgAddress = req.body.imgAddress.toString(),
                electionId = req.body.electionId.toString();

            let debug = false;
            if (debug) {
                res.setHeader('content-type', 'text/json');
                res.send(JSON.stringify({ name, sign, imgAddress, electionId }));
                return;
            } else {
                contract.submitTransaction('addCandidate', name, sign, imgAddress, electionId).then((data) => {
                    console.log(data);
                    let msg = {
                        status: 'success',
                        message: 'Candidate Added'
                    };
                    res.setHeader('content-type', 'text/json');
                    res.send(msg);
                }).catch((err) => {
                    console.log(err);
                    let msg = {
                        status: 'failure',
                        message: err.toString()
                    };
                    res.setHeader('content-type', 'text/json');
                    res.send(msg);
                });
            }
        };
        app.post('/addCandidate', addCandidateHandler);

        let getCandidatesHandler = async (req, res) => {
            let electionId = req.body.electionId.toString();

            let debug = false;
            if (debug) {
                res.setHeader('content-type', 'text/json');
                res.send(electionId);
                return;
            } else {
                contract.evaluateTransaction('getCandidates', electionId).then((data) => {
                    console.log(data.toString());
                    res.setHeader('content-type', 'text/json');
                    res.send(data.toString());
                }).catch((err) => {
                    console.log(err);
                    let msg = {
                        status: 'failure',
                        message: err.toString()
                    };
                    res.setHeader('content-type', 'text/json');
                    res.send(msg);
                });
            }
        };
        app.post('/getCandidates', getCandidatesHandler);


        let registerUserHandler = async (req, res) => {
            let name = req.body.name.toString(),
                email = req.body.email.toString(),
                v1 = req.body.v1.toString(),
                v2 = req.body.v2.toString(),
                v3 = req.body.v3.toString(),
                electionId = req.body.electionId.toString();


            let debug = false;
            if (debug) {
                res.setHeader('content-type', 'text/json');
                res.send(JSON.stringify({ name, email, v1, v2, v3, electionId }));
                return;
            } else {
                contract.submitTransaction('registerVoter', name, email, v1, v2, v3, electionId).then((data) => {
                    console.log(data);
                    let msg = {
                        status: 'success',
                        data: data.toString(),
                        message: 'Voter Added'
                    };
                    res.setHeader('content-type', 'text/json');
                    res.send(msg);
                }).catch((err) => {
                    console.log(err);
                    let msg = {
                        status: 'failure',
                        message: err.toString()
                    };
                    res.setHeader('content-type', 'text/json');
                    res.send(msg);
                });
            }
        };
        app.post('/registerVoter', registerUserHandler);

        let getLoginChallengeHandler = async (req, res) => {
            let result = await contract.evaluateTransaction('getLoginChallenge');
            // result = JSON.parse(result);
            res.setHeader('content-type', 'text/json');
            res.send(result);
        };
        app.get('/getLoginChallenge', getLoginChallengeHandler);
        app.post('/getLoginChallenge', getLoginChallengeHandler);


        let voterLoginHandler = async (req, res) => {
            let email = req.body.email.toString(),
                x = req.body.x.toString(),
                a1 = req.body.a1.toString(),
                a2 = req.body.a2.toString(),
                a3 = req.body.a3.toString(),
                v1 = req.body.v1.toString(),
                v2 = req.body.v2.toString(),
                v3 = req.body.v3.toString(),
                y1 = req.body.y1.toString();

            let debug = false;
            if (debug) {
                res.setHeader('content-type', 'text/json');
                res.send(JSON.stringify({ email, x, a1, a2, a3, v1, v2, v3, y1 }));
                return;
            } else {
                contract.evaluateTransaction('voterLogin', email, x, a1, a2, a3, v1, v2, v3, y1).then((data) => {
                    console.log(data);
                    let msg = {
                        status: 'success',
                        data: JSON.parse(data),
                        message: ''
                    };
                    res.setHeader('content-type', 'text/json');
                    res.send(msg);
                }).catch((err) => {
                    console.log(err);
                    let msg = {
                        status: 'failure',
                        message: err.toString()
                    };
                    res.setHeader('content-type', 'text/json');
                    res.send(msg);
                });
            }
        };
        app.post('/voterLogin', voterLoginHandler);

        let castVoteHandler = async (req, res) => {
            let email = req.body.email.toString(),
                electionID = req.body.electionID.toString(),
                voteContent = req.body.voteContent.toString();

            let debug = false;
            if (debug) {
                res.setHeader('content-type', 'text/json');
                res.send(JSON.stringify({ email, electionID, voteContent }));
            } else {
                contract.submitTransaction('castVote', email, voteContent).then((data) => {
                    console.log(data);
                    let msg = {
                        status: 'success',
                        data: JSON.parse(data),
                        message: 'Vote Cast Successful'
                    };
                    res.setHeader('content-type', 'text/json');
                    res.send(msg);
                }).catch((err) => {
                    console.log(err);
                    let msg = {
                        status: 'failure',
                        message: err.toString()
                    };
                    res.setHeader('content-type', 'text/json');
                    res.send(msg);
                });
            }
        };
        app.post('/castVote', castVoteHandler);


        let calculateResultHandler = async (req, res) => {
            let electionId = req.body.electionId.toString();

            let debug = false;
            if (debug) {
                res.setHeader('content-type', 'text/json');
                res.send(concat(electionId));
                return;
            } else {
                contract.evaluateTransaction('calculateResult', electionId).then((data) => {
                    let ret = JSON.parse(data.toString());

                    contract.evaluateTransaction('getCandidates', electionId).then((data) => {
                        ret.candidates = JSON.parse(data.toString());

                        res.send(JSON.stringify(ret));
                    });
                }).catch((err) => {
                    console.log(err.toString());
                    res.setHeader('content-type', 'text/json');

                    let ret = {
                        id: 'LnfgDsc2WD8F2qNfHK5aResult',
                        publisherID: err.toString(),
                        values: [
                            0,
                            0,
                            0,
                            0
                        ],
                        electionID: 'LnfgDsc2WD8F2qNfHK5a',
                        doctype: 'ElectionResult'
                    };

                    contract.evaluateTransaction('getCandidates', electionId).then((data) => {
                        ret.candidates = JSON.parse(data.toString());

                        res.send(JSON.stringify(ret));
                    });
                });
            }
        };
        app.post('/calculateResult', calculateResultHandler);


        let startElectionHandler = async (req, res) => {
            let electionId = req.body.electionId.toString();

            let debug = false;
            if (debug) {
                res.setHeader('content-type', 'text/json');
                res.send(concat(electionId));
                return;
            } else {
                contract.submitTransaction('startElection', electionId).then((data) => {
                    console.log(data);
                    let msg = {
                        status: 'success',
                        data: data.toString(),
                        message: ''
                    };
                    res.setHeader('content-type', 'text/json');
                    res.send(msg);
                }).catch((err) => {
                    console.log(err);
                    let msg = {
                        status: 'failure',
                        message: err.toString()
                    };
                    res.setHeader('content-type', 'text/json');
                    res.send(msg);
                });
            }
        };
        app.post('/startElection', startElectionHandler);


        app.get('/', function (req, res) {
            res.sendFile(__dirname + '/files/' + 'index.html');
        });


        //let's create a post request endpoint  at /insertMovie
        app.post('/insertMovie', async function (req, res) {
            let name = req.body.name;
            let director = req.body.director;
            let genre = req.body.genre;
            let year = req.body.year;

            //now I have to call the chaincode
            //we are  going to get that code from the invoke.js file

            let key = makeid(20);

            await contract.submitTransaction('createMovie', key, name, director, year, genre);
            res.setHeader('content-type', 'text/json');
            res.send(JSON.stringify({ key, name, director, genre, year }));

            console.log('record added');
        });

        app.get('/viewAllMovies', async function (req, res) {
            const result = await contract.evaluateTransaction('queryAllMovies');

            let resultData = result.toString();
            // let movies = JSON.parse(resultData);

            let html = `<html><body>${resultData}</body></html>`;


            res.setHeader('content-type', 'text/json');
            res.send(html);
        });

        app.post('/queryMoviesByYear', async function (req, res) {
            let year = req.body.year;

            //now I have to call the chaincode
            //we are  going to get that code from the invoke.js file

            const result = await contract.evaluateTransaction('queryMoviesByYear', year);
            res.setHeader('content-type', 'text/json');
            res.send(result.toString());

            console.log('query complete');
        });

        app.post('/queryMoviesByGenre', async function (req, res) {
            let genre = req.body.genre;

            //now I have to call the chaincode
            //we are  going to get that code from the invoke.js file

            const result = await contract.evaluateTransaction('queryMoviesByGenre', genre);
            res.setHeader('content-type', 'text/json');
            res.send(result.toString());

            console.log('query complete');
        });

        const server = app.listen(PORT, function () {
            let host = server.address().address;
            let port = server.address().port;

            console.log('Example app listening at http://%s:%s', host, port);
        });
        ////////////////////////////////////
        //////////////////////////////////////////////////


    } catch (error) {
        console.error(`Failed to evaluate transaction: ${error}`);
        process.exit(1);
    }
}

main();
