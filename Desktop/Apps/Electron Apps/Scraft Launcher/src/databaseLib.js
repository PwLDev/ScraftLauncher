module.exports.createRow = function (data,callback) {
    var table = data.table;
    var row = data.row;
    const tableRow = require('data-store')({ 
      path: process.cwd() + `/database/${table}/${table}_rows.json` 
    });
    const itable = require('data-store')({ 
      path: process.cwd() + `/database/${table}/${table}.json` 
    });
    var totalCount = 0;
    if(itable.get('totalCount') !== undefined){
      totalCount = itable.get('totalCount');
    }
    itable.set('totalCount' , totalCount + 1);
    var row = tableRow.set(`${totalCount}`,row);
    callback(totalCount , row);
}
  //delete row
module.exports.deleteRow = function (data , callback){
    var table = data.table;
    var row = data.row;

    const tableRow = require('data-store')({ 
      	path: process.cwd() + `/database/${table}/${table}_rows.json` 
    });

    const itable = require('data-store')({ 
      	path: process.cwd() + `/database/${table}/${table}.json` 
    });
    	var totalCount = 0;
    	if(itable.get('totalCount') !== undefined){
      	totalCount = itable.get('totalCount');
    } else {
      callback("Error: Cannot delete " , 0);
      return;
    }
  
    tableRow.del(row);
    totalCount = parseFloat(totalCount) - 1;
    itable.set('totalCount',totalCount);
}
  //get all data
  module.exports.getAllRow = function (data, callback){
    var table = data.table;
    const tableRow = require('data-store')({ 
      	path: process.cwd() + `/database/${table}/${table}_rows.json` 
    });

    const itable = require('data-store')({ 
      	path: process.cwd() + `/database/${table}/${table}.json` 
    });

    callback({
      	total:itable.get('totalCount'),
      	allRow:tableRow.data,
      	clear: function(){
        	tableRow.clear();
        	itable.del('totalCount')
      	},
    });
}
  
module.exports.editRow = function (data, callback){
    var table = data.table;
    var row = data.row;
    const tableRow = require('data-store')({ 
      path: process.cwd() + `/database/${table}/${table}_rows.json` 
    });
    tableRow.set(`${row}`,data.value);
    callback(true);
}