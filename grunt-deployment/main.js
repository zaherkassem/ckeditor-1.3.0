/**
 * deployment def for the base classes
 */
define.deployment('deployment.BaseClasses', function (deploymentDef) {

    this.define.resource('runningExperiments', getRunningExperiments());

    function getRunningExperiments() {
        if (window.editorModel && window.editorModel.runningExperiments) {
            return editorModel.runningExperiments;
        }
        if (window.rendererModel && window.rendererModel.runningExperiments) {
            return rendererModel.runningExperiments;
        }
        return {};
    }

    function getCookieInfo(cookie) {
        var cookies = document.cookie.split(';');
        var name = cookie;
        for (var i = 0; i < cookies.length; i++) {
            var c = cookies[i];
            while (c.charAt(0) === ' ') {
                c = c.substring(1, c.length);
            }
            if (c.indexOf(name) === 0) {
                c = c.substring(name.length, c.length);
                return c.replace("=", "");
            }
        }
        return '';
    }

    // Initiate logger with mobile editor settings
    var creationSource = "http://m.wix.com";
    if (window.siteHeader && window.siteHeader.creationSource) {
        switch (window.siteHeader.creationSource.toLocaleLowerCase()) {
            case 'web':
                creationSource = 'http://www.wix.com';
                break;
            case 'standalone':
                creationSource = 'http://mobile.wix.com';
                break;
        }
    }

    // get user's google analytics account from session
    var _userAnalyticsAccount = "";
    if (window.googleAnalytics) {
        _userAnalyticsAccount = (window.googleAnalytics.length === 0) ? "" : window.googleAnalytics;
    }
    var isAnalyticsEnabled = !(window.publicModel && window.publicModel.suppressTrackingCookies);

    deploymentDef.atPhase(PHASES.BOOTSTRAP, function (deploy) {
        console.log('deploy constants');
        deploy.copyNamespace('Constants', 'Const');
        var logParams = {
            'errors':window.wixErrors,
            'events':window.wixEvents,
            // re-examine var names and general logic; more states should be available (editor/viewer/wix/user)
            'wixAnalytics':['UA-2117194-45'],
            'userAnalytics':['UA-2117194-15', 'UA-2117194-44', _userAnalyticsAccount], // Wix's "Mobile Users" account and the user's private account
            'enableGoogleAnalytics':isAnalyticsEnabled,
            'floggerServerURL':(window.serviceTopology && window.serviceTopology.biServerUrl) || 'http://frog.wixpress.com/',
            'majorVer':2,
            'version':((window.viewMode != 'editor') ? 'VR' : 'ER') + window.client_version,
            'siteId':(window['siteId'] ? siteId : ""),
            'userId':(window.siteHeader && window.siteHeader.userId) || "00000000-0000-0000-0000-000000000000",
            'userType':getCookieInfo("userType"),
            'userLanguage':getCookieInfo("wixLanguage") || 'unknown',
            'session':getCookieInfo("_wix_browser_sess") || "00000000-0000-0000-0000-000000000000",
            'computerId':getCookieInfo("_wixCIDX") || "00000000-0000-0000-0000-000000000000",
            'creationSource':creationSource,
            'wixAppId':42, /* 3 = wix mobile */
            'sendPageTrackToWix':window.viewMode == "editor",
            'sendPageTrackToUser':window.viewMode == "site",
            'debugMode':(window['debugMode'] == "debug"),
            'onEvent':function (event, params) {
            },
            'onError':function (err, className, methodName, params) {
                // Show console error in debug mode
                if (window['debugMode'] == 'debug' || window['debugMode'] == 'unit_test') {
                    if (window['console'] && window['console']['error']) {
                        console['error'](err.desc, err, className, methodName, params);
                    }
                }
            }
        };
        deploy.createBootstrapClassInstance('LOG', 'bootstrap.bi.Logger', [logParams]);
        deploy.createBootstrapClassInstance('BI', 'bootstrap.bi.BI', []);
    });

    deploymentDef.atPhase(PHASES.CLASSMANAGER, function (deploy) {
        deploy.createBootstrapClassInstance('W.Utils', 'bootstrap.utils.Utils', []);

        deploy.publishBootstrapClass('WClass', 'bootstrap.bootstrap.WClass');
        deploy.createBootstrapClassInstance('W.Experiments', 'bootstrap.managers.experiments.Experiments', []);
        deploy.createBootstrapClassInstance('W.Classes', 'bootstrap.managers.classmanager.ClassManager', []);
        var done = deploy.async(10, 'Waiting for W.Classes');
        this.resource.getResourceValue('W.Classes', function (classManager) {
            classManager.getClass('bootstrap.utils.Tween', function (Tween) {
                define.utils('Tween:this', function () {
                    return {
                        Tween:Tween
                    };
                });
            });
            done();
        });
    });

    deploymentDef.atPhase(PHASES.LIBS, function (deploy) {
        deploy.publishBootstrapClass('Element', 'bootstrap.extendnative.Element');
        deploy.publishBootstrapClass('Array', 'bootstrap.extendnative.Array');
        deploy.publishBootstrapClass('Async', 'bootstrap.utils.async.Async');
    });

    deploymentDef.atPhase(PHASES.UTILS, function (deploy) {
        deploy.createClassInstance('W.Queue', 'bootstrap.utils.Queue');
        deploy.createClassInstance('W.Commands', 'bootstrap.managers.commands.Commands');
        deploy.createClassInstance('W.Events', 'bootstrap.managers.events.EventsManager');
        deploy.createClassInstance('W.CommandsNew', 'bootstrap.managers.events.CommandsManager');
        deploy.createClassInstance('W.InputBindings', 'bootstrap.managers.InputBindings');
        var done = deploy.async(10, 'Waiting for W.Classes and bootstrap.utils.Hash to be defined');
        this.resource.getResourceValue('W.Classes', function (classManager) {
            classManager.getClass('bootstrap.utils.Hash', function (Hash) {
                define.utils('hash:this', function () {
                    done();
                    return {
                        'hash':new Hash()
                    };
                });
            });
        });

    });

    deploymentDef.atPhase(PHASES.POST_DEPLOY, function (deploy) {
        var done = deploy.async(10, 'Waiting for W.Classes');
        this.resource.getResourceValue('W.Classes', function (classManager) {
            classManager.loadMissingClasses();
            done();
        });
    });
});
