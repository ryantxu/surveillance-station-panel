///<reference path="../node_modules/grafana-sdk-mocks/app/headers/common.d.ts" />

import config from 'app/core/config';
import appEvents from 'app/core/app_events';

import {PanelCtrl} from  'app/plugins/sdk';

import _ from 'lodash';
import moment from 'moment';

import './css/sss.css!';

// Video JS
import './lib/video.js';
import './lib/video-js.css!';

//videojs.options.flash.swf = "http://example.com/path/to/video-js.swf"

class SurveillanceStationCtrl extends PanelCtrl {
  static templateUrl = 'partials/module.html';

  defaults = {
    url: 'https://your-synology-server:5001/webapi/',
    account: 'user',
    passwd: null,
    show: [], // ids that we will see
    min:240,
    max:780,
    showName: true,
    showAudio: true
  };

  auth = {
    count: 0,
    sid: 'EdAYe8TV1ww6U1570NBN581800' // replace from query!!!
  };

  api: any; // Info the API paths
  cameras: Array<any>;
  events: any;
  sheet: any; // CSS

  loading = false;

  /** @ngInject **/
  constructor($scope, $injector, private $q, private $http, private uiSegmentSrv, private datasourceSrv) {
  //  super($scope, $injector);
    super();

    this.events.on('init-edit-mode', this.onInitEditMode.bind(this));
    this.events.on('refresh', this.onRefresh.bind(this));

    // defaults configs
    _.defaultsDeep(this.panel, this.defaults);

    // create a custom sheet
    this.sheet = document.createElement('style');
    document.body.appendChild(this.sheet);
    this.styleChanged();
    this.urlChanged();
  }

  onInitEditMode() {
    this.addEditorTab('Options', 'public/plugins/natel-surveillance-station-panel/partials/editor.html',1);
    this.editorTabIndex = 1;

/**
    this.player = videojs("editor_videojs_id", {}, () => {
      // Player (this) is initialized and ready.
      console.log( 'Player initalized and ready', this.player );
    });
    **/
  }

  onRefresh() {
    console.log('On Refresh...');

    let ts = Date.now();
    _.forEach( this.cameras, camera => {
      camera.snapshot_url = 'https://flow.natelenergy.com:5001'
        + camera.snapshot_path
        + '&_sid=' + this.auth.sid 
        + '&_ts=' + ts
    });
  }

  //-----------------

  styleChanged() {
    this.sheet.innerHTML = ".gallery a { flex-basis: "+this.panel.min+"px; max-width: "+this.panel.max+"px; }";
  }

  urlChanged() {
    delete this.error;
    if(!this.panel.url.endsWith('/')) {
      this.panel.url += '/';
    }

    let params = {
      api: 'SYNO.API.Info',
      method: 'Query',
      version: 1,
      query: 
        'SYNO.API.Auth,'+
        'SYNO.SurveillanceStation.Camera,'+
        'SYNO.SurveillanceStation.Info,'+
        'SYNO.SurveillanceStation.Streaming,'+
        'SYNO.SurveillanceStation.VideoStream,'+
        'SYNO.SurveillanceStation.AudioStream,'+
        'SYNO.SurveillanceStation.Event'
    };

    return this.$http({
      url: this.panel.url + 'query.cgi',
      method: 'GET',
      params: params
    }).then((rsp) => {
      this.api = rsp.data.data;
      console.log( "SYNO.API.Info", this.api );
      return this.authChanged();
    }, err => {
      console.log( "Error Connecting to URL", err );
      this.error = err; //.data.error + " ["+err.status+"]";
      this.inspector = {error: err};
    });
  }

  authChanged() {
    delete this.error;
    console.log('Connection changed XX');

    if(_.isNil(this.panel.account) || _.isNil(this.panel.passwd)) {
      this.error = 'Missing Account/Password';
      return;
    }

    this.listCameras();
  }

   
  showFullscreen(camera) {
    console.log( 'TODO, show live popup', camera ); 
    window.location.href = camera.snapshot_url;
  }

  //-----------------

  moveCamera( camera, direction ) {
    var index = _.indexOf(this.cameras, camera);
    _.move(this.cameras, index, index + direction);
    this.configChanged();
  }

  configChanged() {
    let show = [];
    _.forEach( this.cameras, camera => {
      if( camera._show ) {
        show.push(camera.id);
      }
    });
    this.panel.show = show;
  }

  //-----------------


  api_AuthLogin() {
    console.log( "Do auth", this.panel );
    this.auth.count++;
    
    // auth.cgi?
    let params = {
      api: 'SYNO.API.Auth',
      method: 'Login',
      version: 2,
      account: this.panel.account,
      passwd: this.panel.passwd,
      session: 'SurveillanceStation',
      format:'sid'
    };

    return this.$http({
      url: this.panel.url + 'auth.cgi',
      method: 'GET',
      params: params
    }).then((rsp) => {
      console.log( "Auth OK", rsp );
    }, err => {
      console.log( "Auth Error", err );
      this.error = err; //.data.error + " ["+err.status+"]";
      this.inspector = {error: err};
    });
  }

  listCameras() {
    // auth.cgi?
    let params = {
      api: 'SYNO.SurveillanceStation.Camera',
      method: 'List',
      version: 8,
      basic: true,
      streamInfo: true,
      _sid: this.auth.sid
    };

    return this._doAPI( params ).then( (rsp) => {
      let cameras = rsp.cameras;
      let count = 0;
      for(let i=0; i<this.panel.show.length; i++) {
        var index = _.findIndex(cameras, ['id', this.panel.show[i]]);
        if(index >= 0) {
          try {
            cameras[index]._show = true;
            _.move(cameras, index, i);
            count++;
          }
          catch(err) {
             console.log('error loading cameras', err, cameras);   
          }
        }
      };
      if(cameras<1) {
        _.forEach(cameras, camera => {
          camera._show = true;
        });
      }

      this.cameras = cameras;
      console.log( "listCameras", this.cameras );
      this.onRefresh();
    });
  }


  listEvents( camera ) {
    // auth.cgi?
    let params = {
      api: 'SYNO.SurveillanceStation.Event',
      method: 'List',
      version: 4,
      _sid: this.auth.sid,

      locked: 0,
      cameraIds: 1,
      evtSrcType: 2,

      offset: 0,
      limit: 80,

      fromTime: 0,
      toTime: 0,

      from_start: 0,
      from_end: 0,

      includeAllCam: true,
      blIncludeSnapshot: true,
    };

    return this._doAPI( params ).then( (rsp) => {
      
      this.events = rsp;
      console.log( "listEvents", rsp );
    });
  }



  _doAPI( params: any ) {
    let info = this.api[params.api];
    if(_.isNil(info)) {
      throw "Unkonwn API";
      this.$q.reject( "Unknown API" );
    }

    this.loading = true;
    return this.$http({
      url: this.panel.url + info.path,
      method: 'GET',
      params: params
    }).then((rsp) => {
      this.loading = false;
      if(rsp.data.success) {
        return rsp.data.data;
      }
      return this.$q.reject( rsp.data );
    }, err => {
      this.loading = false;
      return this.$q.reject(err);
    });
  }
}

export {
  SurveillanceStationCtrl as PanelCtrl
};


