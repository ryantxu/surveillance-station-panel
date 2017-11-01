///<reference path="../node_modules/grafana-sdk-mocks/app/headers/common.d.ts" />
///<reference path="../hack/videojs.d.ts" />

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
  };

  auth = {
    count: 0,
    sid: 'EdAYe8TV1ww6U1570NBN581800' // replace from query!!!
  };

  cameras: Array<any>;
  player: VideoJSPlayer;

  /** @ngInject **/
  constructor($scope, $injector, private templateSrv, private $http, private uiSegmentSrv, private datasourceSrv) {
    super($scope, $injector);

    this.events.on('init-edit-mode', this.onInitEditMode.bind(this));
    this.events.on('refresh', this.onRefresh.bind(this));

    // defaults configs
    _.defaultsDeep(this.panel, this.defaults);

    this.connectionChanged();
  }

  onInitEditMode() {
    this.addEditorTab('Options', 'public/plugins/natel-surveillance-station-panel/partials/editor.html',1);
    this.editorTabIndex = 1;

debugger;
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

  connectionChanged() {
    delete this.error;
    console.log('Connection changed XX');
    if(!this.panel.url.endsWith('/')) {
      this.panel.url += '/';
    }

    if(_.isNil(this.panel.account) || _.isNil(this.panel.passwd)) {
      this.error = 'Missing Account/Password';
      return;
    }

    this.api_API_Info();
    this.api_ListCameras();
  //  this.api_GetInfo();
    //this.api_AuthLogin();
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


  api_API_Info() {
    console.log( "SYNO.API.Info", this.panel );
    
    // auth.cgi?
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
      console.log( "SYNO.API.Info", rsp.data.data );
    }, err => {
      console.log( "GetInfo Error", err );
      this.error = err; //.data.error + " ["+err.status+"]";
      this.inspector = {error: err};
    });
  }

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


  api_GetInfo() {
    console.log( "Do GetInfo", this.panel );
    
    // auth.cgi?
    let params = {
      api: 'SYNO.SurveillanceStation.Info',
      method: 'GetInfo',
      version: 6,
      _sid: this.auth.sid
    };

    return this.$http({
      url: this.panel.url + 'entry.cgi',
      method: 'GET',
      params: params
    }).then((rsp) => {
      console.log( "GetInfo OK", rsp );
    }, err => {
      console.log( "GetInfo Error", err );
      this.error = err; //.data.error + " ["+err.status+"]";
      this.inspector = {error: err};
    });
  }

  api_ListCameras() {
    // auth.cgi?
    let params = {
      api: 'SYNO.SurveillanceStation.Camera',
      method: 'List',
      version: 8,
      basic: true,
      streamInfo: true,
      _sid: this.auth.sid
    };

    return this.$http({
      url: this.panel.url + 'entry.cgi',
      method: 'GET',
      params: params
    }).then((rsp) => {
      let cameras = rsp.data.data.cameras;
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
      console.log( "api_ListCameras", this.cameras );
      this.onRefresh();
    }, err => {
      console.log( "api_ListCameras", err );
      this.error = err; //.data.error + " ["+err.status+"]";
      this.inspector = {error: err};
    });
  }
}

export {
  SurveillanceStationCtrl as PanelCtrl
};


