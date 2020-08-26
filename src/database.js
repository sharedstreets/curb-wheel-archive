class Database {

    constructor(db) {
        this.db = init(db);
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
            tx.executeSql('CREATE TABLE IF NOT EXISTS BLEConnection (id INTEGER PRIMARY KEY, address STRING');
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

    insertSurvey(ref ,survey) {
        this.db.transaction(function(tx) {
            tx.executeSql('CREATE TABLE IF NOT EXISTS survey (ref STRING PRIMARY KEY, data STRING');
            tx.executeSql('INSERT INTO survey VALUES (?1, ?2)', [ref, survey]);
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
        this.db.transaction(function(tx) {
            tx.executeSql('SELECT * FROM survey WHERE ref = ?1', [ref], function(tx, rs) {
              console.log(rs.rows[0]);
            }, function(tx, error) {
              console.log('SELECT error: ' + error.message);
            });
          });
    }



}

export default Database