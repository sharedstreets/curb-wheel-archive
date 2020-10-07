class Database {

    constructor(db) {
        this.db = this.init(db);
        this.insertBLEConnection = this.insertBLEConnection.bind(this);
    }


    init(db) {
        db = window.sqlitePlugin.openDatabase({
            name: 'curbwheel.db',
            location: 'default',
            androidDatabaseProvider: 'system'
        });
        return db
    }

    insertBLEConnection(macAddress) {
        this.db.transaction(function(tx) {
            tx.executeSql('CREATE TABLE IF NOT EXISTS BLEConnection (id INTEGER PRIMARY KEY, address STRING)');
            tx.executeSql('INSERT INTO BLEConnection VALUES (?1)', [macAddress]);
        }, function(err) {
            console.log('Transaction ERROR: ' + err.message);
        }, function() {
            console.log('Populated database OK');
        });
    }


    getBLEConnections() {
        this.db.transaction(function(tx) {
            tx.executeSql('SELECT * FROM BLEConnection', [], function(tx, rs) {
              console.log(rs.rows);
            }, function(tx, error) {
              console.log('SELECT error: ' + error.message);
            });
          });
    }

    insertSurvey(ref, streetSide, survey) {
        this.db.transaction(function(tx) {
            tx.executeSql('CREATE TABLE IF NOT EXISTS survey (id INTEGER PRIMARY KEY, ref STRING, streetSide STRING, data STRING)');
            tx.executeSql('INSERT INTO survey (ref, streetSide, data) VALUES (?1, ?2, ?3)', [ref, streetSide, survey]);
        }, function(err) {
            console.log('Transaction ERROR: ' + err.message);
        }, function() {
            console.log('Populated database OK');
        });
    }

    updateSurvey(ref ,survey) {
        this.db.transaction(function(tx) {
            tx.executeSql('UPDATE survey SET data = ?1 WHERE ref = ?2', [survey,ref]);
        }, function(err) {
            console.log('Transaction ERROR: ' + err.message);
        }, function() {
            console.log('Populated database OK');
        });
    }

    getSurvey(ref) {
      return new Promise((resolve, reject) => {
        this.db.transaction(function(tx) {
            tx.executeSql('SELECT * FROM survey WHERE ref = ?1', [ref], function(tx, error) {
                reject(error);
              }, function(tx, rs) {
                resolve(rs.rows[0]);
              });
            });
      });
    }

    getSurveys(ref) {
      return new Promise((resolve, reject) => {
        this.db.transaction(function(tx) {
        tx.executeSql('SELECT * FROM survey', function(tx, error) {
            reject(error);
          }, function(tx, rs) {
            resolve(rs.rows);
          });
        });
      });
    }

    deleteSurveys() {
      return new Promise((resolve, reject) => {
        this.db.transaction(function(tx) {
        tx.executeSql('DELETE FROM survey', function(tx, error) {
            reject(error);
          }, function(tx, rs) {
            resolve(rs.rows);
          });
        });
      });
    }

    insertPhoto(key ,feature_ref, data) {
        this.db.transaction(function(tx) {
            tx.executeSql('CREATE TABLE IF NOT EXISTS photo (id INTEGER PRIMARY KEY, key STRING, feature_ref STRING, data STRING)');
            tx.executeSql('INSERT INTO photo (key, feature_ref, data) VALUES (?1, ?2, ?3)', [key, feature_ref, data]);
        }, function(err) {
            console.log('Transaction ERROR: ' + err.message);
        }, function() {
            console.log('Populated database OK: ' +  key);
        });
    }

    deletePhotos() {
      return new Promise((resolve, reject) => {
        this.db.transaction(function(tx) {
        tx.executeSql('DELETE FROM photo', function(tx, error) {
            reject(error);
          }, function(tx, rs) {
            resolve(rs.rows);
          });
        });
      });
    }

    getPhotos(ref) {
      return new Promise((resolve, reject) => {
        this.db.transaction(function(tx) {
        tx.executeSql('SELECT * FROM photo', function(tx, error) {
            reject(error);
          }, function(tx, rs) {
            resolve(rs.rows);
          });
        });
      });
    }

    getPhotosByFeature(feature_ref) {
        this.db.transaction(function(tx) {
            tx.executeSql('SELECT * FROM photo WHERE feature_ref = ?1', [feature_ref], function(tx, rs) {
              console.log(rs.rows);
            }, function(tx, error) {
              console.log('SELECT error: ' + error.message);
            });
          });
    }


}

export default Database
