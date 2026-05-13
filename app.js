/* global Vue, ElementPlus, _, XLSX, md5 */
(function () {
  var ElMessageBox = ElementPlus.ElMessageBox;
  var ElNotification = ElementPlus.ElNotification;
  var createApp = Vue.createApp;
  var ref = Vue.ref;
  var onMounted = Vue.onMounted;
  var computed = Vue.computed;

  var DEFAULTDATAS = [
    {
      title: "Tab 1",
      name: "1",
      appCode: "IPD_PPM",
      userModel: "IPD项目管理",
      content: [
        {
          name: "",
          enName: "",
          capitalize: "",
          capitalSplice: "",
        },
      ],
    },
  ];

  function jsonpTranslate(url, params) {
    return new Promise(function (resolve, reject) {
      var cb =
        "baidu_jsonp_" + Date.now() + "_" + Math.floor(Math.random() * 1e9);
      var script = document.createElement("script");
      var timeoutId = setTimeout(function () {
        cleanup();
        reject(new Error("翻译请求超时"));
      }, 30000);

      function cleanup() {
        clearTimeout(timeoutId);
        try {
          delete window[cb];
        } catch (e) {
          window[cb] = undefined;
        }
        if (script.parentNode) {
          script.parentNode.removeChild(script);
        }
      }

      window[cb] = function (data) {
        cleanup();
        resolve(data);
      };

      script.onerror = function () {
        cleanup();
        reject(new Error("网络错误"));
      };

      var qs = new URLSearchParams();
      Object.keys(params).forEach(function (k) {
        qs.set(k, String(params[k]));
      });
      qs.set("callback", cb);
      script.src = url + "?" + qs.toString();
      document.head.appendChild(script);
    });
  }

  /**
   * 与 tran/src/views/tools1.js 一致：百度翻译通用接口（JSONP）
   * 生产环境请替换 appid / 密钥并勿提交到公开仓库
   */
  function getTranslate(tableData, appCode) {
    var enCode = ";";
    function removeAllSpace(str) {
      return str.replace(/\s+/g, "");
    }
    function addAllSpace(str) {
      return str.replace(/\s+/g, "_");
    }
    var yourMessage = {
      appid: "20220529001233014",
      userkey: "vC01enyhQ_pyVaul2cdb",
      randomSalt: parseInt(String(Math.random() * 1e9), 10),
    };
    var usefulData = (tableData || []).filter(function (i) {
      return i.name !== "";
    });
    var q = usefulData
      .map(function (i) {
        return i.name;
      })
      .join(enCode);
    function setAppCode(capitalSplice) {
      return appCode ? appCode + capitalSplice : capitalSplice;
    }
    if (!usefulData.length) {
      return Promise.resolve([]);
    }
    return new Promise(function (resolve, reject) {
      var appid = yourMessage.appid;
      var userkey = yourMessage.userkey;
      var randomSalt = yourMessage.randomSalt;
      var str = appid + q + randomSalt + userkey;
      var sign = md5(str);
      var params = {
        appid: appid,
        salt: randomSalt,
        q: q,
        from: "zh",
        to: "en",
        sign: sign,
      };
      var url = "https://fanyi-api.baidu.com/api/trans/vip/translate";
      jsonpTranslate(url, params)
        .then(function (data) {
          if (data && data.error_code) {
            reject(
              new Error(
                (data.error_msg || "错误") + " (" + data.error_code + ")",
              ),
            );
            return;
          }
          var enName =
            (data.trans_result &&
              data.trans_result[0] &&
              data.trans_result[0].dst) ||
            "none";
          var enNameArr = [enName];
          var arr = usefulData.map(function (i, index) {
            return {
              name: i.name,
              enName: enNameArr[index],
              capitalize: removeAllSpace(enNameArr[index].toUpperCase()),
              capitalSplice:
                index === 0
                  ? setAppCode("_" + addAllSpace(enNameArr[index].toUpperCase()))
                  : setAppCode(addAllSpace(enNameArr[index].toUpperCase())),
            };
          });
          resolve(arr);
        })
        .catch(reject);
    });
  }

  createApp({
    template: document.querySelector("#app-template").innerHTML,
    setup: function () {
      var isAllPage = ref(true);
      var dialogVisible = ref(false);
      var dialogMessage = ref("");
      var editableTabsValue = ref("1");
      var editableTabs = ref(_.cloneDeep(DEFAULTDATAS));
      var jsonMessage = ref("");
      var loading = ref(false);
      var timeout = ref(0);
      var exportTableRef = ref(null);

      function initPage() {
        editableTabs.value = _.cloneDeep(DEFAULTDATAS);
        editableTabsValue.value = "1";
      }

      function setTime(times) {
        timeout.value = times;
        function tick() {
          setTimeout(function () {
            timeout.value = timeout.value - 1000;
            if (timeout.value > 0) {
              tick();
            } else {
              timeout.value = 0;
            }
          }, 1000);
        }
        tick();
      }

      function palindrome(str) {
        var newStr = str
          .replace(/-/g, "_")
          .replace(
            /[`:.~!@#$%^&*() \+ =<>?"{}|, \/ ;' \\ [ \] ·~！@#￥%……&*（）—— \+ ={}|《》？：""【】、；''，。、]/g,
            "",
          );
        return newStr.length >= 50
          ? newStr.slice(0, 49) + "CONTENT"
          : newStr;
      }

      var newContent = ref([]);

      function longTranslation(
        contentArr,
        appCode,
        times,
        type,
        notNeedTrans,
      ) {
        var rowItem = editableTabs.value.find(function (i) {
          return i.name === editableTabsValue.value;
        });
        var length = contentArr.filter(function (i) {
          return !!i.name;
        }).length;
        if (!length) {
          return Promise.resolve();
        }
        loading.value = true;
        setTime(1000 * length);
        newContent.value = [];
        var num = 0;

        function delay(ms) {
          return new Promise(function (r) {
            setTimeout(r, ms);
          });
        }

        return (async function () {
          try {
            while (num < length) {
              await delay(times || 1000);
              var resp = await getTranslate([contentArr[num]], appCode);
              var res = resp.map(function (i) {
                return Object.assign({}, i, {
                  capitalSplice: palindrome(i.capitalSplice),
                });
              });
              newContent.value.push(res[0]);
              num++;
            }
            if (type === 1) {
              rowItem.content = notNeedTrans.concat(newContent.value);
            } else if (type === 2) {
              rowItem.content = newContent.value;
            }
          } catch (err) {
            ElNotification({
              title: "翻译失败",
              message: String(err && err.message ? err.message : err),
              type: "error",
            });
          } finally {
            loading.value = false;
          }
        })();
      }

      function onTranslate() {
        try {
          var rowItem = editableTabs.value.find(function (i) {
            return i.name === editableTabsValue.value;
          });
          if (!rowItem) return;
          if (isAllPage.value) {
            if (!rowItem.content || !rowItem.content.length) return;
            longTranslation(rowItem.content, rowItem.appCode, 1000, 2);
          } else {
            var needTrans =
              (rowItem.content &&
                rowItem.content.filter(function (i) {
                  return !i.enName && (i.name || i.name === 0);
                })) ||
              [];
            var notNeedTrans = rowItem.content.filter(function (i) {
              return !!i.enName;
            });
            if (!needTrans.length) return;
            longTranslation(
              needTrans,
              rowItem.appCode,
              1000,
              1,
              notNeedTrans,
            );
          }
        } catch (error) {
          ElNotification({
            message: String(error),
            type: "error",
          });
        }
      }

      function onAdd() {
        var rowItem = editableTabs.value.find(function (i) {
          return i.name === editableTabsValue.value;
        });
        if (!rowItem) return;
        var arrItem = {
          name: "",
          enName: "",
          capitalize: "",
          capitalSplice: "",
        };
        var extra = [];
        for (var k = 0; k < 10; k++) {
          extra.push(JSON.parse(JSON.stringify(arrItem)));
        }
        rowItem.content = rowItem.content.concat(extra);
      }

      function onCopy() {
        var rowItem = editableTabs.value.find(function (i) {
          return i.name === editableTabsValue.value;
        });
        if (!rowItem) return;
        var JsonStringObj = {};
        rowItem.content
          .filter(function (i) {
            return i.capitalSplice !== "";
          })
          .forEach(function (i) {
            JsonStringObj[i.capitalSplice] = i.capitalSplice;
          });
        jsonMessage.value = "{<br/>";
        rowItem.content
          .filter(function (i) {
            return i.capitalSplice !== "";
          })
          .forEach(function (i) {
            jsonMessage.value +=
              "&nbsp;&nbsp;&nbsp;" +
              i.capitalSplice +
              ':&nbsp;"' +
              i.capitalSplice +
              '",&nbsp;//&nbsp;' +
              i.name +
              "<br/>";
          });
        jsonMessage.value += "}";
        dialogVisible.value = true;
        dialogMessage.value = JSON.stringify(JsonStringObj);
      }

      function onSave() {
        var datasJson = JSON.stringify(editableTabs.value);
        localStorage.setItem("ipd_tarnslate_longDatas", datasJson);
        ElNotification({
          message: "保存成功~",
          type: "success",
        });
      }

      function onExport() {
        var rowItem = editableTabs.value.find(function (i) {
          return i.name === editableTabsValue.value;
        });
        var tableElt = exportTableRef.value;
        var workbook = XLSX.utils.table_to_book(tableElt);
        var ws = workbook.Sheets.Sheet1;
        XLSX.utils.sheet_add_aoa(ws, [], { origin: -1 });
        XLSX.writeFile(
          workbook,
          (rowItem.appCode || "export") +
            "_" +
            (rowItem.userModel || "国际化") +
            "国际化.xlsx",
        );
        ElNotification({
          message: "导出成功~",
          type: "success",
        });
      }

      var tableData = computed(function () {
        var tableFilterData = editableTabs.value.find(function (i) {
          return i.name === editableTabsValue.value;
        });
        return (
          (tableFilterData &&
            tableFilterData.content &&
            tableFilterData.content.map(function (i) {
              return {
                appCode: tableFilterData.appCode,
                userModel: tableFilterData.userModel,
                name: i.name,
                enName: i.enName,
                capitalize: i.capitalize,
                capitalSplice: i.capitalSplice,
              };
            })) ||
          []
        );
      });

      function copyEnumeration() {
        var rowItem = editableTabs.value.find(function (i) {
          return i.name === editableTabsValue.value;
        });
        if (!rowItem) return;
        var JsonStringObj = {};
        rowItem.content
          .filter(function (i) {
            return i.capitalSplice !== "";
          })
          .forEach(function (i) {
            JsonStringObj[i.capitalSplice] = i.capitalSplice;
          });
        jsonMessage.value = "";
        rowItem.content
          .filter(function (i) {
            return i.capitalSplice !== "";
          })
          .forEach(function (i) {
            jsonMessage.value +=
              i.capitalSplice +
              '("' +
              i.capitalSplice +
              '","' +
              i.name +
              '")<br/>';
          });
        dialogVisible.value = true;
        dialogMessage.value = JSON.stringify(JsonStringObj);
      }

      function copyConstant() {
        var rowItem = editableTabs.value.find(function (i) {
          return i.name === editableTabsValue.value;
        });
        if (!rowItem) return;
        var JsonStringObj = {};
        rowItem.content
          .filter(function (i) {
            return i.capitalSplice !== "";
          })
          .forEach(function (i) {
            JsonStringObj[i.capitalSplice] = i.capitalSplice;
          });
        jsonMessage.value = "";
        rowItem.content
          .filter(function (i) {
            return i.capitalSplice !== "";
          })
          .forEach(function (i) {
            jsonMessage.value +=
              "public static final String " +
              i.capitalSplice +
              ' = "' +
              i.capitalSplice +
              '";&nbsp;//&nbsp;' +
              i.name +
              "<br/>";
          });
        dialogVisible.value = true;
        dialogMessage.value = JSON.stringify(JsonStringObj);
      }

      function clearAll() {
        ElMessageBox.confirm("清除后将清空所有页面数据？", "tips", {
          confirmButtonText: "确认",
          cancelButtonText: "取消",
          type: "warning",
        })
          .then(function () {
            localStorage.removeItem("ipd_tarnslate_longDatas");
            initPage();
          })
          .catch(function () {});
      }

      function handleTabsEdit(targetName, action) {
        if (action === "add") {
          var addNum = editableTabs.value.length + 1;
          editableTabs.value.push({
            title: "Tab" + addNum,
            name: "" + addNum,
            appCode: "",
            iteration: "",
            userModel: "IPD项目管理",
            content: [],
          });
          editableTabsValue.value = "" + addNum;
        } else if (action === "remove") {
          ElMessageBox.confirm("是否删除此数据?", "tips", {
            confirmButtonText: "是",
            cancelButtonText: "取消",
            type: "warning",
          })
            .then(function () {
              var tabs = editableTabs.value;
              var activeName = editableTabsValue.value;
              if (activeName === targetName) {
                tabs.forEach(function (tab, index) {
                  if (tab.name === targetName) {
                    var nextTab = tabs[index + 1] || tabs[index - 1];
                    if (nextTab) {
                      activeName = nextTab.name;
                    }
                  }
                });
              }
              editableTabsValue.value = activeName;
              editableTabs.value = tabs.filter(function (tab) {
                return tab.name !== targetName;
              });
              if (editableTabs.value.length === 0) {
                initPage();
              }
            })
            .catch(function () {});
        }
      }

      onMounted(function () {
        var datas = localStorage.getItem("ipd_tarnslate_longDatas");
        if (datas) {
          try {
            editableTabs.value = JSON.parse(datas);
          } catch (e) {
            /* ignore */
          }
        }
      });

      return {
        isAllPage: isAllPage,
        dialogVisible: dialogVisible,
        dialogMessage: dialogMessage,
        editableTabsValue: editableTabsValue,
        editableTabs: editableTabs,
        jsonMessage: jsonMessage,
        onTranslate: onTranslate,
        onAdd: onAdd,
        onCopy: onCopy,
        onSave: onSave,
        onExport: onExport,
        handleTabsEdit: handleTabsEdit,
        tableData: tableData,
        exportTableRef: exportTableRef,
        copyEnumeration: copyEnumeration,
        copyConstant: copyConstant,
        clearAll: clearAll,
        timeout: timeout,
        loading: loading,
      };
    },
  })
    .use(ElementPlus)
    .mount("#app");
})();
