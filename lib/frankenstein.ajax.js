(function () {
  'use strict';

  (function (self) {
    'use strict';

    if (self.fetch) {
      return;
    }

    var support = {
      searchParams: 'URLSearchParams' in self,
      iterable: 'Symbol' in self && 'iterator' in Symbol,
      blob: 'FileReader' in self && 'Blob' in self && function () {
        try {
          new Blob();
          return true;
        } catch (e) {
          return false;
        }
      }(),
      formData: 'FormData' in self,
      arrayBuffer: 'ArrayBuffer' in self
    };

    if (support.arrayBuffer) {
      var viewClasses = ['[object Int8Array]', '[object Uint8Array]', '[object Uint8ClampedArray]', '[object Int16Array]', '[object Uint16Array]', '[object Int32Array]', '[object Uint32Array]', '[object Float32Array]', '[object Float64Array]'];

      var isDataView = function isDataView(obj) {
        return obj && DataView.prototype.isPrototypeOf(obj);
      };

      var isArrayBufferView = ArrayBuffer.isView || function (obj) {
          return obj && viewClasses.indexOf(Object.prototype.toString.call(obj)) > -1;
        };
    }

    function normalizeName(name) {
      if (typeof name !== 'string') {
        name = String(name);
      }
      if (/[^a-z0-9\-#$%&'*+.\^_`|~]/i.test(name)) {
        throw new TypeError('Invalid character in header field name');
      }
      return name.toLowerCase();
    }

    function normalizeValue(value) {
      if (typeof value !== 'string') {
        value = String(value);
      }
      return value;
    }

    // Build a destructive iterator for the value list
    function iteratorFor(items) {
      var iterator = {
        next: function next() {
          var value = items.shift();
          return { done: value === undefined, value: value };
        }
      };

      if (support.iterable) {
        iterator[Symbol.iterator] = function () {
          return iterator;
        };
      }

      return iterator;
    }

    function Headers(headers) {
      this.map = {};

      if (headers instanceof Headers) {
        headers.forEach(function (value, name) {
          this.append(name, value);
        }, this);
      } else if (Array.isArray(headers)) {
        headers.forEach(function (header) {
          this.append(header[0], header[1]);
        }, this);
      } else if (headers) {
        Object.getOwnPropertyNames(headers).forEach(function (name) {
          this.append(name, headers[name]);
        }, this);
      }
    }

    Headers.prototype.append = function (name, value) {
      name = normalizeName(name);
      value = normalizeValue(value);
      var oldValue = this.map[name];
      this.map[name] = oldValue ? oldValue + ',' + value : value;
    };

    Headers.prototype['delete'] = function (name) {
      delete this.map[normalizeName(name)];
    };

    Headers.prototype.get = function (name) {
      name = normalizeName(name);
      return this.has(name) ? this.map[name] : null;
    };

    Headers.prototype.has = function (name) {
      return this.map.hasOwnProperty(normalizeName(name));
    };

    Headers.prototype.set = function (name, value) {
      this.map[normalizeName(name)] = normalizeValue(value);
    };

    Headers.prototype.forEach = function (callback, thisArg) {
      for (var name in this.map) {
        if (this.map.hasOwnProperty(name)) {
          callback.call(thisArg, this.map[name], name, this);
        }
      }
    };

    Headers.prototype.keys = function () {
      var items = [];
      this.forEach(function (value, name) {
        items.push(name);
      });
      return iteratorFor(items);
    };

    Headers.prototype.values = function () {
      var items = [];
      this.forEach(function (value) {
        items.push(value);
      });
      return iteratorFor(items);
    };

    Headers.prototype.entries = function () {
      var items = [];
      this.forEach(function (value, name) {
        items.push([name, value]);
      });
      return iteratorFor(items);
    };

    if (support.iterable) {
      Headers.prototype[Symbol.iterator] = Headers.prototype.entries;
    }

    function consumed(body) {
      if (body.bodyUsed) {
        return Promise.reject(new TypeError('Already read'));
      }
      body.bodyUsed = true;
    }

    function fileReaderReady(reader) {
      return new Promise(function (resolve, reject) {
        reader.onload = function () {
          resolve(reader.result);
        };
        reader.onerror = function () {
          reject(reader.error);
        };
      });
    }

    function readBlobAsArrayBuffer(blob) {
      var reader = new FileReader();
      var promise = fileReaderReady(reader);
      reader.readAsArrayBuffer(blob);
      return promise;
    }

    function readBlobAsText(blob) {
      var reader = new FileReader();
      var promise = fileReaderReady(reader);
      reader.readAsText(blob);
      return promise;
    }

    function readArrayBufferAsText(buf) {
      var view = new Uint8Array(buf);
      var chars = new Array(view.length);

      for (var i = 0; i < view.length; i++) {
        chars[i] = String.fromCharCode(view[i]);
      }
      return chars.join('');
    }

    function bufferClone(buf) {
      if (buf.slice) {
        return buf.slice(0);
      } else {
        var view = new Uint8Array(buf.byteLength);
        view.set(new Uint8Array(buf));
        return view.buffer;
      }
    }

    function Body() {
      this.bodyUsed = false;

      this._initBody = function (body) {
        this._bodyInit = body;
        if (!body) {
          this._bodyText = '';
        } else if (typeof body === 'string') {
          this._bodyText = body;
        } else if (support.blob && Blob.prototype.isPrototypeOf(body)) {
          this._bodyBlob = body;
        } else if (support.formData && FormData.prototype.isPrototypeOf(body)) {
          this._bodyFormData = body;
        } else if (support.searchParams && URLSearchParams.prototype.isPrototypeOf(body)) {
          this._bodyText = body.toString();
        } else if (support.arrayBuffer && support.blob && isDataView(body)) {
          this._bodyArrayBuffer = bufferClone(body.buffer);
          // IE 10-11 can't handle a DataView body.
          this._bodyInit = new Blob([this._bodyArrayBuffer]);
        } else if (support.arrayBuffer && (ArrayBuffer.prototype.isPrototypeOf(body) || isArrayBufferView(body))) {
          this._bodyArrayBuffer = bufferClone(body);
        } else {
          throw new Error('unsupported BodyInit type');
        }

        if (!this.headers.get('content-type')) {
          if (typeof body === 'string') {
            this.headers.set('content-type', 'text/plain;charset=UTF-8');
          } else if (this._bodyBlob && this._bodyBlob.type) {
            this.headers.set('content-type', this._bodyBlob.type);
          } else if (support.searchParams && URLSearchParams.prototype.isPrototypeOf(body)) {
            this.headers.set('content-type', 'application/x-www-form-urlencoded;charset=UTF-8');
          }
        }
      };

      if (support.blob) {
        this.blob = function () {
          var rejected = consumed(this);
          if (rejected) {
            return rejected;
          }

          if (this._bodyBlob) {
            return Promise.resolve(this._bodyBlob);
          } else if (this._bodyArrayBuffer) {
            return Promise.resolve(new Blob([this._bodyArrayBuffer]));
          } else if (this._bodyFormData) {
            throw new Error('could not read FormData body as blob');
          } else {
            return Promise.resolve(new Blob([this._bodyText]));
          }
        };

        this.arrayBuffer = function () {
          if (this._bodyArrayBuffer) {
            return consumed(this) || Promise.resolve(this._bodyArrayBuffer);
          } else {
            return this.blob().then(readBlobAsArrayBuffer);
          }
        };
      }

      this.text = function () {
        var rejected = consumed(this);
        if (rejected) {
          return rejected;
        }

        if (this._bodyBlob) {
          return readBlobAsText(this._bodyBlob);
        } else if (this._bodyArrayBuffer) {
          return Promise.resolve(readArrayBufferAsText(this._bodyArrayBuffer));
        } else if (this._bodyFormData) {
          throw new Error('could not read FormData body as text');
        } else {
          return Promise.resolve(this._bodyText);
        }
      };

      if (support.formData) {
        this.formData = function () {
          return this.text().then(decode);
        };
      }

      this.json = function () {
        return this.text().then(JSON.parse);
      };

      return this;
    }

    // HTTP methods whose capitalization should be normalized
    var methods = ['DELETE', 'GET', 'HEAD', 'OPTIONS', 'POST', 'PUT'];

    function normalizeMethod(method) {
      var upcased = method.toUpperCase();
      return methods.indexOf(upcased) > -1 ? upcased : method;
    }

    function Request(input, options) {
      options = options || {};
      var body = options.body;

      if (input instanceof Request) {
        if (input.bodyUsed) {
          throw new TypeError('Already read');
        }
        this.url = input.url;
        this.credentials = input.credentials;
        if (!options.headers) {
          this.headers = new Headers(input.headers);
        }
        this.method = input.method;
        this.mode = input.mode;
        if (!body && input._bodyInit != null) {
          body = input._bodyInit;
          input.bodyUsed = true;
        }
      } else {
        this.url = String(input);
      }

      this.credentials = options.credentials || this.credentials || 'omit';
      if (options.headers || !this.headers) {
        this.headers = new Headers(options.headers);
      }
      this.method = normalizeMethod(options.method || this.method || 'GET');
      this.mode = options.mode || this.mode || null;
      this.referrer = null;

      if ((this.method === 'GET' || this.method === 'HEAD') && body) {
        throw new TypeError('Body not allowed for GET or HEAD requests');
      }
      this._initBody(body);
    }

    Request.prototype.clone = function () {
      return new Request(this, { body: this._bodyInit });
    };

    function decode(body) {
      var form = new FormData();
      body.trim().split('&').forEach(function (bytes) {
        if (bytes) {
          var split = bytes.split('=');
          var name = split.shift().replace(/\+/g, ' ');
          var value = split.join('=').replace(/\+/g, ' ');
          form.append(decodeURIComponent(name), decodeURIComponent(value));
        }
      });
      return form;
    }

    function parseHeaders(rawHeaders) {
      var headers = new Headers();
      rawHeaders.split(/\r?\n/).forEach(function (line) {
        var parts = line.split(':');
        var key = parts.shift().trim();
        if (key) {
          var value = parts.join(':').trim();
          headers.append(key, value);
        }
      });
      return headers;
    }

    Body.call(Request.prototype);

    function Response(bodyInit, options) {
      if (!options) {
        options = {};
      }

      this.type = 'default';
      this.status = 'status' in options ? options.status : 200;
      this.ok = this.status >= 200 && this.status < 300;
      this.statusText = 'statusText' in options ? options.statusText : 'OK';
      this.headers = new Headers(options.headers);
      this.url = options.url || '';
      this._initBody(bodyInit);
    }

    Body.call(Response.prototype);

    Response.prototype.clone = function () {
      return new Response(this._bodyInit, {
        status: this.status,
        statusText: this.statusText,
        headers: new Headers(this.headers),
        url: this.url
      });
    };

    Response.error = function () {
      var response = new Response(null, { status: 0, statusText: '' });
      response.type = 'error';
      return response;
    };

    var redirectStatuses = [301, 302, 303, 307, 308];

    Response.redirect = function (url, status) {
      if (redirectStatuses.indexOf(status) === -1) {
        throw new RangeError('Invalid status code');
      }

      return new Response(null, { status: status, headers: { location: url } });
    };

    self.Headers = Headers;
    self.Request = Request;
    self.Response = Response;

    self.fetch = function (input, init) {
      return new Promise(function (resolve, reject) {
        var request = new Request(input, init);
        var xhr = new XMLHttpRequest();

        xhr.onload = function () {
          var options = {
            status: xhr.status,
            statusText: xhr.statusText,
            headers: parseHeaders(xhr.getAllResponseHeaders() || '')
          };
          options.url = 'responseURL' in xhr ? xhr.responseURL : options.headers.get('X-Request-URL');
          var body = 'response' in xhr ? xhr.response : xhr.responseText;
          resolve(new Response(body, options));
        };

        xhr.onerror = function () {
          reject(new TypeError('Network request failed'));
        };

        xhr.ontimeout = function () {
          reject(new TypeError('Network request failed'));
        };

        xhr.open(request.method, request.url, true);

        if (request.credentials === 'include') {
          xhr.withCredentials = true;
        }

        if ('responseType' in xhr && support.blob) {
          xhr.responseType = 'blob';
        }

        request.headers.forEach(function (value, name) {
          xhr.setRequestHeader(name, value);
        });

        xhr.send(typeof request._bodyInit === 'undefined' ? null : request._bodyInit);
      });
    };
    self.fetch.polyfill = true;
  })(typeof self !== 'undefined' ? self : undefined);

// the whatwg-fetch polyfill installs the fetch() function
// on the global object (window or self)
//
// Return that as the export for use in Webpack, Browserify etc.

  var fetchNpmBrowserify = self.fetch.bind(self);

  var asyncGenerator = function () {
    function AwaitValue(value) {
      this.value = value;
    }

    function AsyncGenerator(gen) {
      var front, back;

      function send(key, arg) {
        return new Promise(function (resolve, reject) {
          var request = {
            key: key,
            arg: arg,
            resolve: resolve,
            reject: reject,
            next: null
          };

          if (back) {
            back = back.next = request;
          } else {
            front = back = request;
            resume(key, arg);
          }
        });
      }

      function resume(key, arg) {
        try {
          var result = gen[key](arg);
          var value = result.value;

          if (value instanceof AwaitValue) {
            Promise.resolve(value.value).then(function (arg) {
              resume("next", arg);
            }, function (arg) {
              resume("throw", arg);
            });
          } else {
            settle(result.done ? "return" : "normal", result.value);
          }
        } catch (err) {
          settle("throw", err);
        }
      }

      function settle(type, value) {
        switch (type) {
          case "return":
            front.resolve({
              value: value,
              done: true
            });
            break;

          case "throw":
            front.reject(value);
            break;

          default:
            front.resolve({
              value: value,
              done: false
            });
            break;
        }

        front = front.next;

        if (front) {
          resume(front.key, front.arg);
        } else {
          back = null;
        }
      }

      this._invoke = send;

      if (typeof gen.return !== "function") {
        this.return = undefined;
      }
    }

    if (typeof Symbol === "function" && Symbol.asyncIterator) {
      AsyncGenerator.prototype[Symbol.asyncIterator] = function () {
        return this;
      };
    }

    AsyncGenerator.prototype.next = function (arg) {
      return this._invoke("next", arg);
    };

    AsyncGenerator.prototype.throw = function (arg) {
      return this._invoke("throw", arg);
    };

    AsyncGenerator.prototype.return = function (arg) {
      return this._invoke("return", arg);
    };

    return {
      wrap: function (fn) {
        return function () {
          return new AsyncGenerator(fn.apply(this, arguments));
        };
      },
      await: function (value) {
        return new AwaitValue(value);
      }
    };
  }();





  var classCallCheck = function (instance, Constructor) {
    if (!(instance instanceof Constructor)) {
      throw new TypeError("Cannot call a class as a function");
    }
  };

  var createClass = function () {
    function defineProperties(target, props) {
      for (var i = 0; i < props.length; i++) {
        var descriptor = props[i];
        descriptor.enumerable = descriptor.enumerable || false;
        descriptor.configurable = true;
        if ("value" in descriptor) descriptor.writable = true;
        Object.defineProperty(target, descriptor.key, descriptor);
      }
    }

    return function (Constructor, protoProps, staticProps) {
      if (protoProps) defineProperties(Constructor.prototype, protoProps);
      if (staticProps) defineProperties(Constructor, staticProps);
      return Constructor;
    };
  }();









  var inherits = function (subClass, superClass) {
    if (typeof superClass !== "function" && superClass !== null) {
      throw new TypeError("Super expression must either be null or a function, not " + typeof superClass);
    }

    subClass.prototype = Object.create(superClass && superClass.prototype, {
      constructor: {
        value: subClass,
        enumerable: false,
        writable: true,
        configurable: true
      }
    });
    if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass;
  };











  var possibleConstructorReturn = function (self, call) {
    if (!self) {
      throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
    }

    return call && (typeof call === "object" || typeof call === "function") ? call : self;
  };

  'use strict';

  var Engine = function () {
    function Engine() {
      classCallCheck(this, Engine);
    }

    createClass(Engine, null, [{
      key: 'init',
      value: function init(options, cb) {

        this.tenant = options.tenant;
        this.pattern = options.pattern || '%%';
        this.env = options.env || 'server';
        this.override = options.override;

        cb();
      }
    }, {
      key: 'transform',
      value: function transform(target, cb) {

        var worker = void 0;

        if (this.env === 'server') worker = ServerWorker;
        if (this.env === 'browser') worker = BrowserWorker;

        var keyReferenceHash = worker.parseKeys(target);

        if (!keyReferenceHash.keys || keyReferenceHash.keys.length === 0) {
          return cb('err');
        }

        var query = 'k=' + keyReferenceHash.keys.join('&k=');

        fetch((this.override || 'https://public.frankenstein.io') + '/public/keys/' + this.tenant + '?' + query).then(function (resp) {
          return resp.json();
        }).then(function (data) {

          var transformed = worker.replaceContents(data, keyReferenceHash.reference);

          cb(null, transformed); // replace in file
        }).catch(function (err) {
          cb(err);
        });
      }
    }]);
    return Engine;
  }();

  var ServerWorker = function (_Engine) {
    inherits(ServerWorker, _Engine);

    function ServerWorker() {
      classCallCheck(this, ServerWorker);
      return possibleConstructorReturn(this, (ServerWorker.__proto__ || Object.getPrototypeOf(ServerWorker)).apply(this, arguments));
    }

    createClass(ServerWorker, null, [{
      key: 'replaceContents',
      value: function replaceContents(data, reference) {
        var _this2 = this;

        data.dictionary.forEach(function (entry) {

          reference = reference.replace(new RegExp(_this2.pattern + '(' + entry.key + ')' + _this2.pattern), entry.value);
        });

        return reference;
      }
    }, {
      key: 'parseKeys',
      value: function parseKeys(rootElem) {
        var _this3 = this;

        var keys = rootElem.match(new RegExp(this.pattern + '(\\S*)' + this.pattern, 'g')).map(function (k) {
          return k.replace(new RegExp(_this3.pattern, 'g'), '');
        });

        return {
          keys: keys,
          reference: rootElem
        };
      }
    }]);
    return ServerWorker;
  }(Engine);

  var BrowserWorker = function (_Engine2) {
    inherits(BrowserWorker, _Engine2);

    function BrowserWorker() {
      classCallCheck(this, BrowserWorker);
      return possibleConstructorReturn(this, (BrowserWorker.__proto__ || Object.getPrototypeOf(BrowserWorker)).apply(this, arguments));
    }

    createClass(BrowserWorker, null, [{
      key: 'parseKeys',
      value: function parseKeys(rootElem) {
        var reference = [];
        var keys = [];
        var iterator = document.createNodeIterator(rootElem, NodeFilter.SHOW_COMMENT, function () {
          return NodeFilter.FILTER_ACCEPT;
        }, false);
        var curNode = void 0;

        while (curNode = iterator.nextNode()) {

          if (new RegExp(this.pattern + '(\\S*)' + this.pattern).test(curNode.nodeValue.trim())) {

            var key = curNode.nodeValue.trim().replace(new RegExp(this.pattern, 'g'), '');

            keys.push(key);
            reference.push({
              key: key, comment: curNode
            });
          }
        }

        return {
          keys: keys,
          reference: reference
        };
      }
    }, {
      key: 'replaceContents',
      value: function replaceContents(data, reference) {

        var keys = data.dictionary.map(function (entry) {
          return entry.key;
        });

        data.dictionary.forEach(function (entry) {

          if (entry.type === 'html') {

            var crafted = document.createElement('div');
            crafted.innerHTML = entry.value;
            reference.shift().comment.replaceWith(crafted);
          } else {
            reference.shift().comment.replaceWith(entry.value);
          }
        });

        return keys;
      }
    }]);
    return BrowserWorker;
  }(Engine);

  var integration_core = Engine;

  'use strict';

  (function (arr) {
    arr.forEach(function (item) {
      if (item.hasOwnProperty('replaceWith')) {
        return;
      }
      Object.defineProperty(item, 'replaceWith', {
        configurable: true,
        enumerable: true,
        writable: true,
        value: function replaceWith() {
          var argArr = Array.prototype.slice.call(arguments),
            docFrag = document.createDocumentFragment();

          argArr.forEach(function (argItem) {
            var isNode = argItem instanceof Node;
            docFrag.appendChild(isNode ? argItem : document.createTextNode(String(argItem)));
          });

          this.parentNode.replaceChild(docFrag, this);
        }
      });
    });
  })([Element.prototype, CharacterData.prototype, DocumentType.prototype]);

  var Worker = function () {
    function Worker() {
      classCallCheck(this, Worker);


      this.transformedFn = null;
      this.target = null;
    }

    createClass(Worker, null, [{
      key: 'listen',
      value: function listen() {
        var _this = this;

        var observer = new MutationObserver(function (mutations) {

          var comments = [];

          mutations.forEach(function (mutation) {

            if (mutation.addedNodes.length > 0) {

              var curNode = void 0;
              var iterator = document.createNodeIterator(mutation.addedNodes[0], NodeFilter.SHOW_COMMENT, function () {
                return NodeFilter.FILTER_ACCEPT;
              }, false);

              while (curNode = iterator.nextNode()) {
                comments.push(curNode.nodeValue);
              }
            }
          });

          if (comments.length > 0) {
            _this.transform();
          }

          comments = [];
        });

        var config = {
          childList: true,
          characterData: true,
          subtree: true
        };

        observer.observe(Worker.target, config);
      }
    }, {
      key: 'transform',
      value: function transform() {
        var _this2 = this;

        integration_core.transform(this.target, function (err, keys) {

          if (!err && _this2.transformedFn) {
            _this2.transformedFn(keys);
          }
        });
      }
    }, {
      key: 'on',
      value: function on(event, cb) {

        switch (event) {
          case 'transformed':
            this.transformedFn = cb;
        }
      }
    }]);
    return Worker;
  }();

  window.frankenstein = {
    init: function init(options) {

      options = Object.assign({ env: 'browser' }, options || {});
      Worker.target = options.target || document.body;

      var deferred = new Promise(function (resolve, reject) {

        integration_core.init(options, function () {

          resolve(Worker);
        });
      });

      return deferred;
    }
  };

}());
