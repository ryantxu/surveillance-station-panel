///<reference path="../node_modules/grafana-sdk-mocks/app/headers/common.d.ts" />

import config from 'app/core/config';
import appEvents from 'app/core/app_events';

import {PanelCtrl} from  'app/plugins/sdk';

import _ from 'lodash';
import moment from 'moment';


class SurveillanceStationCtrl extends PanelCtrl {
  static templateUrl = 'partials/module.html';

  defaults = {
    url: 'https://your-synology-server:5001/webapi/',
    account: 'user',
    passwd: null
  };

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
  }

  onRefresh() {
    console.log('On Refresh...');
  }

  //-----------------

  connectionChanged() {
    delete this.error;
    console.log('Connection changed');
    if(!this.panel.url.endsWith('/')) {
      this.panel.url += '/';
    }

    if(_.isNil(this.panel.account) || _.isNil(this.panel.passwd)) {
      this.error = 'Missing Account/Password';
      return;
    }

    this.api_AuthLogin();
  }


  //-----------------

  api_AuthLogin() {
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
      url: this.panel.url + '/auth.cgi',
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
}

export {
  SurveillanceStationCtrl as PanelCtrl
};


