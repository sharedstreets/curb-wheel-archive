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



}

export default Database