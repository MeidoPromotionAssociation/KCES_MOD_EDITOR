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
}

func main() {
	app := internal.NewApp()

	wailsApp := application.New(application.Options{
		Name:        "KCES_MOD_EDITOR",
		Description: "All In One Modding tool for KCES",
		Services: []application.Service{
			application.NewService(app),
			// 服装部件 / Parts
			application.NewService(&KCESService.MenuAssetsService{}),
			application.NewService(&KCESService.MaterialAssetsService{}),
			application.NewService(&KCESService.PriorityMaterialAssetsService{}),
			application.NewService(&KCESService.ModelService{}),
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
