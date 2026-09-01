package main

import (
	"embed"
	"log"

	"github.com/MeidoPromotionAssociation/KCES_MOD_EDITOR/internal"
	KCESService "github.com/MeidoPromotionAssociation/MeidoSerialization/v2/service/KCES"
	"github.com/wailsapp/wails/v3/pkg/application"
	"github.com/wailsapp/wails/v3/pkg/events"
)

//go:embed all:frontend/dist
var assets embed.FS

func init() {
	application.RegisterEvent[string]("editor:file-dropped")
	// 协议唤起：外部工具用 kces-mod-editor://open?path=... 请求打开文件
	application.RegisterEvent[string](internal.ProtocolOpenEvent)
}

func main() {
	app := internal.NewApp()

	// 单实例回调要用到应用与窗口，两者都在下面才创建，因此先声明变量由闭包捕获
	// The single-instance callback needs the app and window created below, so closures capture these declarations
	var wailsApp *application.App
	var mainWindow *application.WebviewWindow

	// 单实例是设置项，关掉后每次协议唤起都会开新窗口，目标文件仍会在冷启动路径上打开
	// Single instance is a setting; with it off every protocol invocation opens another window and the target file still opens on the cold-start path
	var singleInstance *application.SingleInstanceOptions
	if internal.LoadSettings().SingleInstance {
		singleInstance = &application.SingleInstanceOptions{
			UniqueID: "Github.MeidoPromotionAssociation.KCES_MOD_EDITOR",
			OnSecondInstanceLaunch: func(data application.SecondInstanceData) {
				// 已有窗口时把它带到前台，否则协议唤起看起来像什么都没发生
				// Bringing the existing window forward, otherwise a protocol invocation looks like nothing happened
				if mainWindow != nil {
					mainWindow.Show()
					mainWindow.Focus()
				}
				if path := internal.OpenTargetFromArgs(data.Args); path != "" && wailsApp != nil {
					wailsApp.Event.Emit(internal.ProtocolOpenEvent, path)
				}
			},
		}
	}

	wailsApp = application.New(application.Options{
		Name:        "KCES_MOD_EDITOR",
		Description: "All In One Modding tool for KCES",
		// 单实例：协议每次唤起都启新进程会堆积窗口，默认把请求转交给已在运行的实例
		// Single instance: letting every protocol invocation spawn a process would pile up windows,
		// so by default the request is handed over to the instance already running
		SingleInstance: singleInstance,
		Services: []application.Service{
			application.NewService(app),
			// 服装部件 / Parts
			application.NewService(&KCESService.MenuAssetsService{}),
			application.NewService(&KCESService.MaterialAssetsService{}),
			application.NewService(&KCESService.PriorityMaterialAssetsService{}),
			application.NewService(&KCESService.ModelService{}),
			// 贴图 / Texture（独立 Unity Texture2D 主文件，走 App 自己的服务而不是结构化 JSON 通道）
			application.NewService(&internal.Texture2DService{}),
			// 物理 / Physics payloads
			application.NewService(&KCESService.DBConfService{}),
			application.NewService(&KCESService.DBColService{}),
			application.NewService(&KCESService.DB2ConfService{}),
			application.NewService(&KCESService.DSBConfService{}),
			application.NewService(&KCESService.DSB2ConfService{}),
			application.NewService(&KCESService.DSLConfService{}),
			application.NewService(&KCESService.DSL2ConfService{}),
			application.NewService(&KCESService.DSLColService{}),
			application.NewService(&KCESService.IKColService{}),
			application.NewService(&KCESService.IKColBytesService{}),
			application.NewService(&KCESService.LimbColService{}),
			// 角色 / Character
			application.NewService(&KCESService.PresetService{}),
			application.NewService(&KCESService.PersetService{}),
			application.NewService(&KCESService.SavedAttachService{}),
			application.NewService(&KCESService.HitCheckService{}),
			application.NewService(&KCESService.MaidColliderService{}),
			// 数据 / Data
			application.NewService(&KCESService.NSONService{}),
			application.NewService(&KCESService.UndressDataService{}),
			application.NewService(&KCESService.UndressPartsDataService{}),
			application.NewService(&KCESService.PskService{}),
			application.NewService(&KCESService.NeiService{}),
		},
		Assets: application.AssetOptions{
			Handler: application.AssetFileServerFS(assets),
		},
	})
	app.SetApplication(wailsApp)

	window := wailsApp.Window.NewWithOptions(application.WebviewWindowOptions{
		Title:            "KCES MOD EDITOR by 90135",
		Width:            1280,
		Height:           800,
		MinWidth:         980,
		MinHeight:        640,
		EnableFileDrop:   true,
		BackgroundColour: application.NewRGB(27, 38, 54),
		URL:              "/",
	})
	mainWindow = window
	window.OnWindowEvent(events.Common.WindowFilesDropped, func(event *application.WindowEvent) {
		files := event.Context().DroppedFiles()
		if len(files) > 0 {
			wailsApp.Event.Emit("editor:file-dropped", files[0])
		}
	})

	if err := wailsApp.Run(); err != nil {
		log.Fatal(err)
	}
}
