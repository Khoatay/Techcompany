package app.chillspace;

import android.app.Activity;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.view.View;
import android.view.ViewGroup;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;

/**
 * ChillSpace cho Android (điện thoại + máy tính bảng): mở bản web ChillSpace trong khung riêng.
 * Web sửa là app tự có bản mới. Nhạc / âm thanh phát ngay, vẫn chạy khi tắt màn hình hay chuyển app.
 */
public class MainActivity extends Activity {
  static final String APP_URL = "https://khoatay.github.io/Techcompany/chillspace/";
  static final String APP_HOST = "khoatay.github.io";
  static final String APP_PATH = "/Techcompany/chillspace";
  static final int PICK_FILE = 41;

  private WebView web;
  private FrameLayout root;
  private ValueCallback<Uri[]> fileCallback;
  private View fullView;

  @Override
  protected void onCreate(Bundle state) {
    super.onCreate(state);
    root = new FrameLayout(this);
    root.setBackgroundColor(Color.rgb(13, 15, 23));
    web = new WebView(this);
    web.setBackgroundColor(Color.rgb(13, 15, 23));
    root.addView(web, new FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));
    setContentView(root);

    WebSettings s = web.getSettings();
    s.setJavaScriptEnabled(true);
    s.setDomStorageEnabled(true);
    s.setDatabaseEnabled(true);
    s.setMediaPlaybackRequiresUserGesture(false); // âm thanh nền & nhạc phát ngay
    s.setLoadWithOverviewMode(true);
    s.setUseWideViewPort(true);
    s.setSupportZoom(false);
    s.setUserAgentString(s.getUserAgentString() + " ChillSpaceAndroid/1.0");

    web.setWebViewClient(new WebViewClient() {
      @Override
      public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest req) {
        Uri u = req.getUrl();
        String scheme = u.getScheme() == null ? "" : u.getScheme();
        if (!req.isForMainFrame()) return false;
        if (scheme.startsWith("http") && APP_HOST.equals(u.getHost()) && u.getPath() != null && u.getPath().startsWith(APP_PATH)) return false;
        if (scheme.equals("file")) return false;
        try { startActivity(new Intent(Intent.ACTION_VIEW, u)); } catch (Exception e) { /* không có app mở link */ }
        return true; // link ngoài: mở bằng trình duyệt
      }

      @Override
      public void onReceivedError(WebView view, WebResourceRequest req, WebResourceError err) {
        if (req.isForMainFrame()) view.loadUrl("file:///android_asset/offline.html");
      }
    });

    web.setWebChromeClient(new WebChromeClient() {
      // chọn ảnh đại diện trong Phòng chung
      @Override
      public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> cb, FileChooserParams params) {
        if (fileCallback != null) fileCallback.onReceiveValue(null);
        fileCallback = cb;
        try { startActivityForResult(params.createIntent(), PICK_FILE); } catch (Exception e) { fileCallback = null; return false; }
        return true;
      }

      // video YouTube toàn màn hình
      @Override
      public void onShowCustomView(View view, CustomViewCallback cb) {
        fullView = view;
        root.addView(view, new FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));
        web.setVisibility(View.GONE);
      }

      @Override
      public void onHideCustomView() {
        if (fullView != null) { root.removeView(fullView); fullView = null; }
        web.setVisibility(View.VISIBLE);
      }
    });

    if (state != null) web.restoreState(state);
    else web.loadUrl(APP_URL);
  }

  @Override
  protected void onActivityResult(int req, int res, Intent data) {
    if (req == PICK_FILE && fileCallback != null) {
      fileCallback.onReceiveValue(WebChromeClient.FileChooserParams.parseResult(res, data));
      fileCallback = null;
      return;
    }
    super.onActivityResult(req, res, data);
  }

  @Override
  protected void onSaveInstanceState(Bundle out) {
    super.onSaveInstanceState(out);
    web.saveState(out);
  }

  @Override
  public void onBackPressed() {
    if (fullView != null) { onHideFull(); return; }
    // nút Back: đóng cửa sổ trên cùng trong app (như phím Esc); không còn gì để đóng thì thu app xuống (nhạc vẫn chạy)
    web.evaluateJavascript("(function(){var w=[].slice.call(document.querySelectorAll('.win')).filter(function(x){return !x.hidden&&!x.classList.contains('collapsed')});"
        + "if(w.length){document.body.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}));return 1}return 0})()",
        v -> { if (!"1".equals(v)) moveTaskToBack(true); });
  }

  private void onHideFull() {
    if (fullView != null) { root.removeView(fullView); fullView = null; }
    web.setVisibility(View.VISIBLE);
  }

  @Override
  protected void onDestroy() {
    if (web != null) { web.destroy(); web = null; }
    super.onDestroy();
  }
}
